#!/bin/sh
# Points index.html's preconnect hints at this deployment's Keycloak origin.
#
# The portal renders nothing until keycloak.init() resolves, and that check runs
# in an iframe against a different origin — so the DNS + TLS setup for it would
# otherwise start only after the bundle has downloaded and begun executing.
# Preconnecting overlaps it with the bundle download instead.
#
# index.html ships with the development default baked in; this rewrites it to
# $KEYCLOAK_ORIGIN, the same variable the CSP is templated with. Runs after
# 40-portal-config.sh, and independently of it: neither touches the other's file.
set -eu

TARGET=/usr/share/nginx/html/index.html
ORIGIN=${KEYCLOAK_ORIGIN:-}

if [ -z "$ORIGIN" ]; then
  echo "45-portal-preconnect.sh: KEYCLOAK_ORIGIN unset — leaving the built-in hint"
  exit 0
fi

if ! [ -w "$TARGET" ]; then
  echo "45-portal-preconnect.sh: $TARGET is not writable — leaving it untouched"
  exit 0
fi

# Only the tagged links, so a stray href elsewhere in the document is untouched.
# `|` as the sed delimiter since the value is a URL. The origin comes from the
# deployment's own compose file, but escape `|`, `&` and `\` anyway rather than
# let a malformed value corrupt the document.
escaped=$(printf '%s' "$ORIGIN" | sed -e 's/[\\|&]/\\&/g')

tmp=$(mktemp)
sed -e "s|href=\"[^\"]*\"\( data-portal-preconnect\)|href=\"$escaped\"\1|g" "$TARGET" > "$tmp"

if cmp -s "$tmp" "$TARGET"; then
  rm -f "$tmp"
  echo "45-portal-preconnect.sh: preconnect already points at $ORIGIN"
  exit 0
fi

cat "$tmp" > "$TARGET"
rm -f "$tmp"
echo "45-portal-preconnect.sh: preconnect hints point at $ORIGIN"
