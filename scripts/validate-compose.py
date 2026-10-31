"""Parse the deployment template with synthetic values; never start a container."""
from pathlib import Path
import json,subprocess,tempfile
root=Path(__file__).resolve().parents[1]
values={line.split('=',1)[0]:'fixture' for line in (root/'.env.example').read_text(encoding='utf-8').splitlines() if line and not line.startswith('#') and '=' in line}
values.update(JIAYOU_COMPOSE_PROJECT='jiayou-validation',JIAYOU_DATABASE_VOLUME='jiayou_validation_external',JIAYOU_BACKEND_IMAGE='jiayou-backend:validation',JIAYOU_FRONTEND_IMAGE='jiayou-frontend:validation')
for key in values:
 if key.endswith('_MEMORY_LIMIT'):values[key]='256m'
 if key.endswith('_CPU_LIMIT'):values[key]='0.5'
 if key.endswith('_PIDS_LIMIT'):values[key]='128'
with tempfile.TemporaryDirectory(prefix='jiayou-compose-check-') as temp:
 env=Path(temp)/'fixture.env';env.write_text('\n'.join(f'{key}={value}' for key,value in values.items()),encoding='utf-8')
 data=json.loads(subprocess.check_output(['docker','compose','--env-file',str(env),'-f',str(root/'docker-compose.yml'),'config','--format','json'],text=True))
 for service in data['services'].values():
  assert not service.get('ports') and not service.get('container_name')
 assert data['volumes']['jiayou_database']['external']
 assert data['networks']['database']['internal']
 assert data['services']['backend']['environment']['JIAYOU_BOOTSTRAP_MODE']=='validate'
 assert data['services']['frontend']['depends_on']['backend']['condition']=='service_healthy'
print('Compose parses; private ports, external database volume, validate-only startup and health ordering verified. No services started.')
