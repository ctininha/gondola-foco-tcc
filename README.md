# GôndolaFoco — MVP do TCC

Aplicativo web responsivo para auditoria visual de gôndolas, com análise de foto por IA no servidor, comparação com planograma estruturado, leitura de preços e persistência local em SQLite.

## Requisitos

- Node.js 20 ou superior
- npm
- Chave de API do Gemini configurada somente no backend

## Configuração

1. Preserve seu arquivo `.env` local (ele não é distribuído no ZIP).
2. Confira se o arquivo contém:

```env
GEMINI_API_KEY=SUA_CHAVE_PRIVADA
GEMINI_MODEL=gemini-2.5-flash
API_PORT=3001
APP_ORIGIN=http://localhost:5173
VITE_API_URL=http://localhost:3001
```

3. Na pasta do projeto, instale as dependências:

```bash
npm install
```

4. Inicie interface e API juntas:

```bash
npm run dev:all
```

5. Abra `http://localhost:5173`. A API deve responder em `http://localhost:3001/api/health` com `aiConfigured: true`.

## Fluxo de auditoria

1. Acesse o ambiente de demonstração.
2. Informe corredor e código do módulo.
3. Importe o CSV do planograma e, preferencialmente, o CSV de preços vigentes.
4. Selecione a imagem de referência do planograma.
5. Na captura, selecione a foto da gôndola. No Mac, o seletor de arquivos permite escolher uma imagem do computador; em celulares compatíveis, `capture=environment` pode abrir a câmera.
6. Revise e envie para análise.
7. Consulte resultado, indicadores, ocorrências e histórico.

Os CSVs de exemplo em `public/modelos/` reproduzem as linhas fictícias do Anexo A da especificação. Substitua-os por dados reais da loja antes de uma demonstração com resultados reais.

## Formato dos arquivos

Planograma: `Módulo;Prateleira;Posição;Código de barras;Nome;Marca;Faces`

Preços: `Código de barras;Preço;Vigência início;Vigência fim`

- Código de barras: 8 a 14 dígitos.
- Preço: formato brasileiro, por exemplo `7,99`.
- Datas: `dd/mm/aaaa`.
- O módulo informado no formulário deve corresponder ao valor da coluna `Módulo`.
- Linhas com preços fora da vigência não entram na comparação.

## Indicadores

A implementação de `server/indicators.js` segue a Seção 6 da especificação:

- `IR = A / V × 100`
- `ICP = P / V × 100`
- `IDP = D / Q × 100`
- `IGE = média de (100 − IR), ICP e (100 − IDP)`

`Q` inclui preços legíveis iguais e divergentes. Preços ilegíveis ou sem etiqueta pedem revisão manual e não entram no IDP antes de conferência. Itens indeterminados não contam como ruptura. Se algum componente não puder ser calculado, o IGE usa a média dos componentes disponíveis; se nenhum existir, fica não calculável.

Valide as fórmulas com:

```bash
npm run test:indicators
```

## Armazenamento e segurança

- A chave Gemini fica no `.env` do servidor e não é importada pelo frontend.
- Auditorias e resultados ficam em `data/gondola-foco.sqlite`.
- Fotos ficam em `data/photos/`.
- `.env`, `data/` e os bancos locais são ignorados pelo Git.
- Não inclua fotos reais de clientes ou funcionários na apresentação sem autorização.

## Limites desta entrega técnica

Esta versão conecta o fluxo de auditoria à API e ao banco local, substituindo resultados fictícios por respostas reais ou mensagens de erro. O login ainda é um acesso de demonstração local, não autenticação segura por matrícula/senha. Também permanecem para etapas seguintes do MVP: painel administrativo para cadastro/versionamento de planogramas e revisão gerencial de alertas, importação XLSX, fila offline com sincronização, trilha completa de auditoria, política automática de retenção e conexão publicada com Power BI. Não há integração com ERP, aplicativo nativo ou portal de fornecedor nesta versão.
