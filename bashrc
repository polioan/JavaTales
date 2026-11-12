if [[ -f ~/.bashrc ]]; then
    source ~/.bashrc
elif [[ -f ~/.bash_profile ]]; then
    source ~/.bash_profile
elif [[ -f ~/.profile ]]; then
    source ~/.profile
fi

java-tales() {
  if [[ -x ./java-tales ]]; then
    ./java-tales "$@"
  elif type -P java-tales >/dev/null; then
    command java-tales "$@"
  else
    bun ./cli/cli.ts "$@"
  fi
}