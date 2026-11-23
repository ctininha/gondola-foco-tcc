# Instalação no Mac — GôndolaFoco Gestão

1. Faça uma cópia de segurança da pasta `~/Documents/gondola-foco-tcc`.
2. Extraia o ZIP de entrega. Copie a pasta `gestao` extraída para dentro de `~/Documents/gondola-foco-tcc` (não substitua outras pastas).
3. Abra o Terminal e execute:

```bash
cd ~/Documents/gondola-foco-tcc
node gestao/server.js
```

4. Acesse `http://localhost:5174` no navegador.

A Gestão usa as dependências já declaradas no `package.json` original (`express` e `better-sqlite3`). Se ainda não instaladas, rode `npm install` na raiz do projeto.

Para executar a Auditoria em paralelo, abra outros dois Terminais e use `npm run api` e `npm run dev`, como anteriormente.

**Opcional:** adicione `"gestao": "node gestao/server.js"` à seção `scripts` do `package.json` se quiser iniciar usando `npm run gestao`. Isso não é necessário para a instalação.

**Não rode `git add` ou `git push` ainda.** Confira primeiro os arquivos com `git status --short`. A Gestão foi projetada para leitura apenas; não altera o banco de dados.
