# Atualização: estoque opcional no CSV de preços

## O que muda

- O CSV de preços pode conter a coluna `Quantidade estoque` (ou `quantidade_estoque`).
- O saldo deve ser inteiro não negativo. Campo vazio significa **não informado**, nunca zero.
- Arquivos de preços antigos continuam válidos.
- O planograma e os indicadores IR, ICP, IDP e IGE não mudam.
- Para cada nova auditoria, o saldo do CSV é guardado no resultado de cada SKU, como fotografia lógica do momento da importação; não há consulta online.
- A Gestão usa somente os itens com estado `A` da última auditoria de cada corredor/módulo:
  - saldo positivo: **Reposição** (verificar disponibilidade e reposição);
  - saldo zero: **Compras** (avaliar compra);
  - saldo ausente: **Conferência** (conferir estoque).
- Auditorias anteriores sem campo de saldo aparecem em Conferência.
- A Gestão permanece somente leitura. Não há alteração de estoque nem movimentação de ERP.

## Instalação segura no Mac

1. Pare os servidores nos terminais com Ctrl+C.
2. Descompacte este pacote **sobre a pasta do projeto** `~/Documents/gondola-foco-tcc` (mantendo os demais arquivos).
3. Reinicie a API (`npm run api`), a Auditoria (`npm run dev`) e a Gestão (`node gestao/server.js`) em terminais separados.
4. Abra http://localhost:5173 e http://localhost:5174.
5. Baixe o modelo de CSV atualizado na tela de importação e execute uma **nova auditoria** com esse arquivo. Auditorias já salvas não são reclassificadas com saldos que não possuíam.

## GitHub

Este ZIP não foi publicado automaticamente. Confira `git status --short`, execute os testes e revise o diff antes de adicionar e publicar os arquivos. Não inclua `.env`, `data/`, fotos, arquivos de backup ou `node_modules`.
