# Hospital Marito

RPG idle de navegador (Next.js 16 + MongoDB Atlas). O jogador é um paciente; a coordenação (Mestre) cuida de missões, alas e avisos.

## Variáveis de ambiente

| Variável | Obrigatória | Para que serve |
| --- | --- | --- |
| `MONGODB_URI` | Sim | Endereço do cluster no Atlas (sem nome de banco no fim). |
| `SESSION_SECRET` | Sim | Assina as sessões. Mínimo 32 caracteres, aleatória. |
| `MONGODB_DB` | Não | Nome do banco. Padrão `marito`. Use `marito_dev` no computador para não mexer nos dados do jogo publicado. |

Gerar um segredo novo:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Rodar no computador

```bash
npm install
npm run db:testar     # testa a conexão
npm run db:semear     # missões de exemplo
npm run db:equipe     # conta da coordenação
npm run dev           # http://localhost:3000
```

Os comandos `db:*` leem o `.env.local`. Para rodar um deles contra outro banco, troque `MONGODB_DB` no `.env.local`.

## Publicar na Vercel

1. **Atlas › Database & Network Access › IP Access List:** adicione `0.0.0.0/0` (a Vercel não tem IP fixo no plano gratuito). Use um usuário do banco com senha forte e permissão só de leitura e escrita.
2. **Vercel › Add New › Project:** importe o repositório `aristoph-ubrain/Marito`. O framework (Next.js) é detectado sozinho; não mude os comandos de build.
3. **Environment Variables:** `MONGODB_URI` e `SESSION_SECRET` (um segredo novo, diferente do local). `MONGODB_DB` só se quiser um banco diferente de `marito`.
4. **Deploy.** Depois, em Settings › Functions › Function Region, escolha a região mais perto do cluster do Atlas (São Paulo = `gru1`, se o cluster estiver em `sa-east-1`).
5. Prepare o banco de produção do seu computador, com o `.env.local` apontando para ele: `npm run db:semear` e `npm run db:equipe`.

Cada `git push` na branch `main` publica de novo sozinho.
