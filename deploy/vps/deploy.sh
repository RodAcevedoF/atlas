set -euo pipefail

export ATLAS_IMAGE_TAG="${1:?Pass the release commit SHA}"
if [[ ! "$ATLAS_IMAGE_TAG" =~ ^[0-9a-f]{40}$ ]]; then
  printf '%s\n' 'Release must be a full commit SHA' >&2
  exit 1
fi

release_directory="/opt/atlas/releases/$ATLAS_IMAGE_TAG"
test -s /opt/atlas/.env
test -f "$release_directory/compose.vps.yaml"
exec 9>/opt/atlas/deploy.lock
flock -n 9

compose=(sudo -n --preserve-env=ATLAS_IMAGE_TAG docker compose --project-name atlas --env-file /opt/atlas/.env -f "$release_directory/compose.vps.yaml")
"${compose[@]}" config --quiet
active_worker=$(sudo -n docker ps -q --filter label=com.docker.compose.project=atlas --filter label=com.docker.compose.service=worker)
if [[ -n "$active_worker" ]]; then
  printf '%s\n' 'Worker is active; coordinate its deployment before continuing' >&2
  exit 1
fi

"${compose[@]}" pull redis
"${compose[@]}" up -d --no-build --pull never --wait --wait-timeout 180 redis intelligence api web
"${compose[@]}" exec -T web wget -q -O /dev/null http://127.0.0.1/
"${compose[@]}" exec -T web wget -q -O /dev/null http://127.0.0.1/api/health
ln -sfn "$release_directory" /opt/atlas/current
"${compose[@]}" ps
