#!/bin/bash
set -e

echo "======================================================"
echo "🕊️  SUBINDO O SISTEMA DA PASTORAL MISSIONÁRIA PARA O GITHUB"
echo "======================================================"

# Verifica se o gh está autenticado
if ! gh auth status >/dev/null 2>&1; then
  echo ""
  echo "Por favor, faça login no GitHub com o comando:"
  echo "👉 gh auth login"
  echo ""
  echo "Selecione: GitHub.com > HTTPS > Login with a web browser"
  exit 1
fi

echo ""
echo "Criando repositório 'pastoral-missionaria' no seu GitHub..."
gh repo create pastoral-missionaria --public --source=. --push || {
  echo "Repositório já existe ou falhou. Tentando adicionar remote e enviar..."
  git remote add origin https://github.com/PedroPignata/pastoral-missionaria.git 2>/dev/null || true
  git branch -M main
  git push -u origin main
}

echo ""
echo "======================================================"
echo "✓ CÓDIGO ENVIADO COM SUCESSO PARA O SEU GITHUB!"
echo "======================================================"
echo ""
echo "Agora no Render (https://dashboard.render.com/):"
echo "1. Clique em 'New +' no topo direito"
echo "2. Selecione 'Blueprint'"
echo "3. Escolha o repositório 'pastoral-missionaria'"
echo "4. Clique em 'Apply'!"
echo ""
echo "O Render vai criar o serviço na nuvem e gerar o link definitivo!"

