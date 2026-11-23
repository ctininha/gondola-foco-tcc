# GôndolaFoco — atualização de preços v3

## Regra aprovada

A comparação de preços ocorre apenas quando o produto é identificado (estado P ou F), há preço cadastrado no sistema, a etiqueta está legível e associada ao SKU, e a confiança de leitura é >= 0,85. O servidor compara valores em centavos; somente diferenças geram ocorrência de preço. Produto ausente (A), indeterminado (I), etiqueta ausente/ilegível e preço sem cadastro não geram alerta nem entram no IDP.

O preço cadastrado é apresentado ao varejista como **Preço do sistema**. A Gestão mostra também o **Preço na gôndola**, a diferença por unidade e orientação de conferência. A diferença não representa perda financeira comprovada.

Na Gestão, as ocorrências são agrupadas por SKU e ID da auditoria, exibindo etiquetas para cada tipo. Os registros históricos permanecem inalterados no SQLite; para exibição, a Gestão recalcula os indicadores a partir dos itens históricos conforme a nova regra e mantém os estados de tratativa das ocorrências ainda válidas. Por isso, os números apresentados podem diferir de resultados históricos gravados antes desta atualização.

## Instalação

1. Pare a API de Auditoria e o servidor Gestão com Control+C. Não é necessário apagar banco ou fotos.
2. Faça uma cópia de segurança do projeto, principalmente dos arquivos modificados, antes de instalar.
3. Extraia este ZIP na raiz `~/Documents/gondola-foco-tcc`.
4. Rode `npm run lint`, `npm run build`, `npm run test:indicators` e `git diff --check`.
5. Reinicie a API (`npm run api`), o Vite (`npm run dev`) e a Gestão (`node gestao/server.js`) em janelas separadas.
6. Faça uma nova auditoria de teste com produtos e etiquetas comparáveis. Confira o painel Gestão na porta 5174.

A publicação no GitHub deve ocorrer somente depois da revisão dos arquivos e da validação local. Não inclua `.env`, banco SQLite, fotos ou backups.
