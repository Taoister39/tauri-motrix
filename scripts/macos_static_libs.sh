#!/bin/bash

# pkg-config --static still emits -l flags, which can select Homebrew dylibs.
# Resolve third-party libraries to archive paths while keeping macOS system libs.
static_pkg_config() {
  local output flag directory archive
  local flags=() directories=() resolved=()
  output="$(pkg-config --static --libs "$@")" || return 1
  read -r -a flags <<< "$output"

  for flag in "${flags[@]}"; do
    if [[ "$flag" == -L* ]]; then
      directories+=("${flag#-L}")
    fi
  done

  for flag in "${flags[@]}"; do
    case "$flag" in
      -L*) ;;
      -lSystem|-lc++|-lc|-lm|-lpthread|-ldl|-lresolv|-liconv)
        resolved+=("$flag")
        ;;
      -l*)
        archive=""
        for directory in "${directories[@]}"; do
          if [ -f "$directory/lib${flag#-l}.a" ]; then
            archive="$directory/lib${flag#-l}.a"
            break
          fi
        done
        if [ -z "$archive" ]; then
          echo "Error: Static archive for $flag not found ($*)." >&2
          return 1
        fi
        resolved+=("$archive")
        ;;
      *) resolved+=("$flag") ;;
    esac
  done

  printf '%s\n' "${resolved[*]}"
}

check_macos_dependencies() {
  local output dependency
  output="$(otool -L "$1")" || return 1
  echo "$output"
  while IFS= read -r dependency; do
    case "$dependency" in
      /usr/lib/*|/System/Library/*) ;;
      *)
        echo "Error: Non-system dependency in $1: $dependency" >&2
        return 1
        ;;
    esac
  done < <(printf '%s\n' "$output" | sed -n '2,$s/^[[:space:]]*\(.*\) (compatibility version.*$/\1/p')
}
