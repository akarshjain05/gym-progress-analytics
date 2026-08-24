import os

with open('.github/workflows/deploy.yml', 'r') as f:
    deploy_content = f.read()

# Extract the deploy job
deploy_job = deploy_content.split('jobs:\n')[1]

with open('.github/workflows/ci.yml', 'r') as f:
    ci_content = f.read()

new_deploy_job = deploy_job.replace('  deploy:', '  deploy:\n    needs: test-backend\n    if: github.ref == \'refs/heads/main\'')

ci_content = ci_content + '\n' + new_deploy_job

with open('.github/workflows/ci.yml', 'w') as f:
    f.write(ci_content)

os.remove('.github/workflows/deploy.yml')
