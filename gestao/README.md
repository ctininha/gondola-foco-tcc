# GôndolaFoco Gestão — primeira versão

Aplicação gerencial independente, adicionada sem mover ou modificar os arquivos da Auditoria.

## Executar

Na raiz do projeto, após `npm install`:

```bash
npm run gestao
```

Abrir `http://localhost:5174`. A Auditoria permanece em `http://localhost:5173` (Vite) e a API de Auditoria em `http://localhost:3001`.

A Gestão tem **seu próprio servidor HTTP** (`gestao/server.js`), que lê `data/gondola-foco.sqlite` com `readonly: true`, `fileMustExist: true` e `PRAGMA query_only=ON`. Não expõe métodos de alteração de auditorias. As fotos são servidas diretamente da pasta compartilhada com validação do nome de arquivo. Por padrão o servidor da Gestão escuta apenas `127.0.0.1`.

## Indicadores e limites

- A visão atual considera a **última auditoria de cada par corredor/módulo** para evitar somar repetidamente o mesmo módulo.
- IR = ausências visuais / itens avaliáveis; ICP = itens na posição / itens avaliáveis; IDP = divergências de preço / preços avaliáveis.
- IGE = média aritmética das dimensões disponíveis: (100 − IR), ICP e (100 − IDP). É um índice definido pelo projeto, não um padrão universal.
- Itens indeterminados não são considerados rupturas; etiquetas ilegíveis/ausentes não são classificadas como preços divergentes.
- O sistema não possui dados de estoque, movimentação ou vendas. Portanto não distingue automaticamente ruptura de gôndola de falta de estoque nem calcula perdas financeiras.
- As ocorrências podem conter mais de um registro por produto (por exemplo, ruptura e etiqueta ausente).
- A leitura da base não exige que a API de Auditoria esteja em execução, mas a base deve ter sido criada previamente pela Auditoria.

## Segurança e escopo

Uso local de TCC. Não publicar a porta 5174 na rede ou internet sem adicionar autenticação e controles de acesso. A API é somente leitura, mas a base de dados é compartilhada; mantenha backups e permissões de arquivos apropriadas.
