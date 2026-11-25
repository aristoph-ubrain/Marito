# Guia: salvar as missões no MongoDB

**Problema:** hoje, ao publicar uma missão no editor, ela não aparece em lugar nenhum.

**Causa:**
- O editor (`app/coordenacao/missoes/editor/EditorOrdem.tsx`) só mostra a mensagem de sucesso e não grava nada.
- A lista da coordenação (`ListaOrdens.tsx`) mostra uma lista fixa chamada `ORDENS`, escrita no próprio arquivo.
- A tela do paciente (`app/(paciente)/missoes/page.tsx`) lê as missões fixas de `lib/mock.ts`.

**Objetivo:** o editor grava a ordem no MongoDB, e as duas telas leem as ordens de lá.

```
Editor ──(server action)──► MongoDB, coleção "ordens"
                               │
             ┌─────────────────┴─────────────────┐
             ▼                                   ▼
 Lista da coordenação                  Quadro do paciente
 (todas as situações)                  (só as publicadas)
```

Faça um passo de cada vez e confira o "✅ Pronto quando" antes de seguir para o próximo.

---

## Passo 0: Conferir a conexão

```powershell
npm run db:testar
```

✅ Pronto quando aparecer `✔ Conectado ao MongoDB Atlas (banco: marito).`

---

## Passo 1: Conexão compartilhada com o banco

Crie o arquivo **`lib/db.ts`**:

```ts
import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI não definida no .env.local");

// Em desenvolvimento o Next recarrega os módulos a cada alteração.
// Guardar o cliente no globalThis evita abrir uma conexão nova toda vez.
const global = globalThis as unknown as { _mongo?: Promise<MongoClient> };
const clientePromise = global._mongo ?? new MongoClient(uri).connect();
if (process.env.NODE_ENV !== "production") global._mongo = clientePromise;

export async function banco(): Promise<Db> {
  return (await clientePromise).db("marito");
}
```

> O `next dev` já carrega o `.env.local` sozinho. Não é preciso mudar nada no `package.json`.

✅ Pronto quando: o arquivo existir e o `npm run lint` não acusar erros.

---

## Passo 2: Tipo e funções de leitura das ordens

Crie o arquivo **`lib/ordens.ts`**. Ele guarda tudo o que lê ou escreve na coleção `ordens`.

```ts
import { banco } from "./db";
import type { ChaveAtributo, Missao } from "./mock";

export type Situacao = "pub" | "ras" | "arq";

export type Ordem = {
  codigo: string;                 // "OS-031"
  titulo: string;
  ala: string;                    // "CAPELA"
  descricao: string;
  requisitos: { atributo: ChaveAtributo; minimo: number }[];
  xp: number;
  duracao: number;                // em segundos
  situacao: Situacao;
  vezes: number;                  // quantas vezes foi concluída
  autor: string;
  protegida?: boolean;
  criadaEm: Date;
};

async function colecao() {
  return (await banco()).collection<Ordem>("ordens");
}

/** Todas as ordens, para a coordenação. */
export async function listarOrdens(): Promise<Ordem[]> {
  const c = await colecao();
  return c.find({}, { projection: { _id: 0 } }).sort({ codigo: 1 }).toArray();
}

/** Só as publicadas, já no formato que o quadro do paciente usa. */
export async function listarMissoesPublicadas(): Promise<Missao[]> {
  const c = await colecao();
  const ordens = await c.find({ situacao: "pub" }, { projection: { _id: 0 } }).sort({ codigo: 1 }).toArray();
  return ordens.map((o) => ({
    codigo: o.codigo,
    titulo: o.titulo,
    local: o.ala,
    descricao: o.descricao,
    requisitos: o.requisitos,
    xp: o.xp,
    duracao: o.duracao,
  }));
}

/** Gera o próximo código (OS-032, OS-033…) de forma segura, com um contador no banco. */
export async function proximoCodigo(): Promise<string> {
  const db = await banco();
  const contador = await db
    .collection<{ _id: string; valor: number }>("contadores")
    .findOneAndUpdate({ _id: "ordens" }, { $inc: { valor: 1 } }, { upsert: true, returnDocument: "after" });
  return `OS-${String(contador!.valor).padStart(3, "0")}`;
}
```

> **Por que usar `projection: { _id: 0 }`?** O `_id` do MongoDB é um `ObjectId`, que não pode ser enviado de um Server Component para um Client Component. Sem ele, os objetos chegam ao cliente sem erro.

✅ Pronto quando: o arquivo compilar sem erros (`npx tsc --noEmit`).

---

## Passo 3: Copiar as ordens de exemplo para o banco

Para o banco não começar vazio, copie para ele as ordens fixas que hoje estão em `ListaOrdens.tsx`.

Crie o arquivo **`scripts/semear-ordens.mjs`**:

```js
// Copia as ordens de exemplo para o MongoDB. Uso: npm run db:semear
import { MongoClient } from "mongodb";

const s = (mmss) => { const [m, ss] = mmss.split(":").map(Number); return m * 60 + ss; };
const ordens = [
  { codigo: "OS-004", titulo: "Limpeza do Refeitório", ala: "TÉRREO", descricao: "", requisitos: [{ atributo: "FOR", minimo: 1 }], xp: 20, duracao: s("00:10"), situacao: "arq", vezes: 212, autor: "Enf. R. Matos" },
  { codigo: "OS-008", titulo: "Contar os Leitos", ala: "ALA A", descricao: "", requisitos: [{ atributo: "CON", minimo: 1 }], xp: 30, duracao: s("00:10"), situacao: "arq", vezes: 98, autor: "Enf. noturno" },
  { codigo: "OS-011", titulo: "Inventário da Farmácia", ala: "TÉRREO", descricao: "Conferir estoque de medicação controlada. Há mais frascos registrados do que pacientes.", requisitos: [{ atributo: "CON", minimo: 3 }], xp: 80, duracao: s("00:20"), situacao: "pub", vezes: 42, autor: "Dr. ██████" },
  { codigo: "OS-014", titulo: "Turno na Lavanderia", ala: "ALA B", descricao: "Separar roupas de cama. Uma das etiquetas tem o número do seu prontuário.", requisitos: [{ atributo: "FOR", minimo: 3 }], xp: 60, duracao: s("00:15"), situacao: "pub", vezes: 57, autor: "Enf. R. Matos" },
  { codigo: "OS-019", titulo: "Escutar o Quarto 112", ala: "ALA C", descricao: "Pacientes relatam batidas na parede. O quarto 112 está vazio desde 1998.", requisitos: [{ atributo: "VIN", minimo: 5 }, { atributo: "AFI", minimo: 3 }], xp: 220, duracao: s("00:40"), situacao: "pub", vezes: 9, autor: "— não identificado", protegida: true },
  { codigo: "OS-023", titulo: "Corredor das Portas Trancadas", ala: "ALA C", descricao: "Verificar as fechaduras durante a ronda. Uma delas abre por dentro.", requisitos: [{ atributo: "AGI", minimo: 4 }, { atributo: "SOR", minimo: 4 }], xp: 180, duracao: s("00:35"), situacao: "pub", vezes: 3, autor: "Dr. ██████" },
  { codigo: "OS-027", titulo: "Sessão com o Dr. ██████", ala: "CONSULTÓRIOS", descricao: "Entrevista sem prontuário anexado. O paciente deve manter contato visual.", requisitos: [{ atributo: "DOM", minimo: 3 }], xp: 260, duracao: s("00:45"), situacao: "pub", vezes: 1, autor: "Dr. ██████" },
  { codigo: "OS-031", titulo: "Ronda na Capela", ala: "CAPELA", descricao: "Verificar se as velas estão apagadas. Não responder se alguém chamar pelo nome.", requisitos: [{ atributo: "RIT", minimo: 3 }, { atributo: "AFI", minimo: 4 }], xp: 200, duracao: s("00:50"), situacao: "ras", vezes: 0, autor: "Dr. ██████" },
];

const cliente = new MongoClient(process.env.MONGODB_URI);
try {
  const db = (await cliente.connect()).db("marito");
  const col = db.collection("ordens");
  await col.createIndex({ codigo: 1 }, { unique: true });
  for (const o of ordens) {
    await col.updateOne({ codigo: o.codigo }, { $setOnInsert: { ...o, criadaEm: new Date() } }, { upsert: true });
  }
  // O próximo código gerado será OS-032.
  await db.collection("contadores").updateOne({ _id: "ordens" }, { $max: { valor: 31 } }, { upsert: true });
  console.log(`✔ ${ordens.length} ordens no banco.`);
} finally {
  await cliente.close();
}
```

No **`package.json`**, adicione o script logo abaixo de `db:testar`:

```json
"db:semear": "node --env-file=.env.local scripts/semear-ordens.mjs"
```

Rode o script:

```powershell
npm run db:semear
```

> O script pode ser rodado mais de uma vez sem duplicar nada: o `$setOnInsert` só cria a ordem que ainda não existe.

✅ Pronto quando aparecer `✔ 8 ordens no banco.` e, no Atlas (Browse Collections → `marito.ordens`), as 8 ordens estiverem lá.

---

## Passo 4: Server actions para gravar

Crie o arquivo **`app/coordenacao/missoes/actions.ts`**:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { banco } from "@/lib/db";
import { proximoCodigo, type Ordem } from "@/lib/ordens";

type DadosOrdem = Pick<Ordem, "titulo" | "ala" | "descricao" | "requisitos" | "xp" | "duracao">;
type Resultado = { ok: true; codigo: string } | { ok: false; erro: string };

function atualizarTelas() {
  revalidatePath("/coordenacao/missoes");
  revalidatePath("/missoes");
}

export async function salvarOrdem(dados: DadosOrdem, publicar: boolean): Promise<Resultado> {
  // Nunca confie só na validação do navegador: valide de novo aqui.
  if (!dados.titulo.trim()) return { ok: false, erro: "Informe o título da ordem." };
  if (!dados.requisitos.length) return { ok: false, erro: "Inclua ao menos um requisito." };
  if (new Set(dados.requisitos.map((r) => r.atributo)).size !== dados.requisitos.length)
    return { ok: false, erro: "Há atributos repetidos nos requisitos." };

  const codigo = await proximoCodigo();
  const db = await banco();
  await db.collection<Ordem>("ordens").insertOne({
    ...dados,
    titulo: dados.titulo.trim(),
    codigo,
    situacao: publicar ? "pub" : "ras",
    vezes: 0,
    autor: "Dr. ██████", // trocar pelo usuário logado quando o login estiver pronto
    criadaEm: new Date(),
  });

  atualizarTelas();
  return { ok: true, codigo };
}

export async function alternarSituacao(codigo: string): Promise<Resultado> {
  const col = (await banco()).collection<Ordem>("ordens");
  const ordem = await col.findOne({ codigo });
  if (!ordem) return { ok: false, erro: `${codigo}: ordem não encontrada.` };
  if (ordem.protegida)
    return { ok: false, erro: `${codigo}: ordem protegida. Não foi possível arquivar. Responsável não identificado.` };

  await col.updateOne({ codigo }, { $set: { situacao: ordem.situacao === "pub" ? "arq" : "pub" } });
  atualizarTelas();
  return { ok: true, codigo };
}
```

> O `revalidatePath` avisa o Next que as duas telas mudaram. Ao abrir de novo, elas leem o banco já com a ordem nova.

✅ Pronto quando: `npx tsc --noEmit` não acusar erros.

---

## Passo 5: Ligar o editor à server action

Edite o arquivo **`app/coordenacao/missoes/editor/EditorOrdem.tsx`**.

**5.1** Imports (no topo):

```ts
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { salvarOrdem } from "../actions";
```

**5.2** Converter a duração: o editor usa `"00:50"` (minutos:segundos), e o banco guarda segundos. Adicione esta função acima do componente:

```ts
const paraSegundos = (mmss: string) => { const [m, s] = mmss.split(":").map(Number); return m * 60 + s; };
```

**5.3** Troque a função `salvar` por esta:

```ts
const router = useRouter();
const [salvando, iniciar] = useTransition();
const [codigo, setCodigo] = useState<string | null>(null);

const salvar = (publicar: boolean) => {
  setMsg(null);
  iniciar(async () => {
    const r = await salvarOrdem(
      { titulo, ala, descricao, requisitos: reqs, xp, duracao: paraSegundos(duracao) },
      publicar,
    );
    if (!r.ok) return setMsg({ texto: r.erro, ok: false });
    setCodigo(r.codigo);
    setPublicada(publicar);
    setMsg({ texto: publicar ? `Ordem ${r.codigo} publicada.` : `Rascunho ${r.codigo} salvo.`, ok: true });
    router.push("/coordenacao/missoes");
  });
};
```

**5.4** Troque as duas ocorrências do texto fixo `OS-031` (no cabeçalho e na pré-visualização) por:

```tsx
{codigo ?? "NOVA"}
```

**5.5** Nos botões PUBLICAR e SALVAR RASCUNHO, adicione `disabled={salvando}` para evitar clique duplo.

**5.6** Os valores iniciais dos campos ("Ronda na Capela" etc.) eram só de exemplo. Troque por valores vazios:

```ts
const [titulo, setTitulo] = useState("");
const [ala, setAla] = useState(ALAS[0]);
const [descricao, setDescricao] = useState("");
const [reqs, setReqs] = useState<{ atributo: ChaveAtributo; minimo: number }[]>([{ atributo: "FOR", minimo: 1 }]);
const [xp, setXp] = useState(50);
const [duracao, setDuracao] = useState("00:20");
```

✅ Pronto quando: ao publicar, a tela voltar para a lista e a ordem nova (OS-032) aparecer no Atlas.

---

## Passo 6: Lista da coordenação lendo do banco

**6.1** Troque o conteúdo de **`app/coordenacao/missoes/page.tsx`** por:

```tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { listarOrdens } from "@/lib/ordens";
import { ListaOrdens } from "./ListaOrdens";

async function Ordens() {
  await connection(); // dados sempre frescos, lidos a cada acesso
  return <ListaOrdens ordens={await listarOrdens()} />;
}

export default function CoordMissoesPage() {
  return (
    <Suspense fallback={<p className="text-xs">Consultando o arquivo…</p>}>
      <Ordens />
    </Suspense>
  );
}
```

> **Por que usar `<Suspense>` e `connection()`?** Este projeto liga o `cacheComponents` no `next.config.ts`. Nesse modo, toda leitura que precisa ser feita a cada acesso, como ler o banco, deve ficar dentro de um `<Suspense>`. Sem isso, o Next mostra o erro "blocking route".

**6.2** Em **`ListaOrdens.tsx`**:

1. **Apague** a constante `ORDENS` inteira.
2. Troque os imports por:

```ts
import Link from "next/link";
import { useState, useTransition } from "react";
import { Titulo } from "@/components/ui";
import { siglaDe } from "@/lib/mock";
import type { Ordem, Situacao } from "@/lib/ordens";
import { dois, mmss } from "@/lib/regras";
import { alternarSituacao } from "./actions";
```

> Use `import type` para `Ordem` e `Situacao`. Assim o código de `lib/ordens.ts`, que acessa o banco, não vai parar no navegador.

3. Apague a linha `type Situacao = ...`, porque agora o tipo vem de `lib/ordens`.
4. Troque o começo do componente por:

```tsx
export function ListaOrdens({ ordens }: { ordens: Ordem[] }) {
  const [aba, setAba] = useState<Situacao>("pub");
  const [msg, setMsg] = useState("");
  const [, iniciar] = useTransition();
  const contar = (s: Situacao) => dois(ordens.filter((o) => o.situacao === s).length);

  const alternar = (o: Ordem) => {
    setMsg("");
    iniciar(async () => {
      const r = await alternarSituacao(o.codigo);
      if (!r.ok) setMsg(r.erro);
    });
  };
```

5. No JSX, troque:

| Antes | Depois |
|---|---|
| `ORDENS.filter((o) => sit[o.codigo] === aba)` | `ordens.filter((o) => o.situacao === aba)` |
| `const s = sit[o.codigo];` | `const s = o.situacao;` |
| `o.req.map((r) => <span key={r} …>{r}</span>)` | `o.requisitos.map((r) => <span key={r.atributo} …>{siglaDe(r.atributo)} {dois(r.minimo)}</span>)` |
| `{o.dur}` | `{mmss(o.duracao)}` |

✅ Pronto quando: `/coordenacao/missoes` mostrar as ordens do banco, e "ARQUIVAR"/"PUBLICAR" continuarem funcionando depois de recarregar a página (F5).

---

## Passo 7: Quadro do paciente lendo do banco

Troque o conteúdo de **`app/(paciente)/missoes/page.tsx`** por:

```tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { paciente as p } from "@/lib/mock";
import { listarMissoesPublicadas } from "@/lib/ordens";
import { QuadroMissoes } from "./QuadroMissoes";

async function Quadro() {
  await connection();
  const missoes = await listarMissoesPublicadas();
  return (
    <QuadroMissoes
      missoes={missoes}
      atributos={p.atributos}
      nivel={p.nivel}
      xpInicial={p.xp}
      feitasHoje={p.missoesHoje}
    />
  );
}

export default function MissoesPage() {
  return (
    <Suspense fallback={<p className="text-xs">Consultando o quadro…</p>}>
      <Quadro />
    </Suspense>
  );
}
```

> O paciente (atributos, nível, XP) continua vindo do `mock.ts` por enquanto. Levar o paciente para o banco é a próxima etapa, depois do login.

> A missão secreta `OS-0██` do mock sai do quadro. Se quiser mantê-la, crie essa ordem no banco pelo editor ou pelo script do Passo 3.

✅ Pronto quando: uma ordem publicada no editor aparecer em `/missoes`, e uma ordem arquivada sumir de lá.

---

## Passo 8: Teste completo

Com `npm run dev` rodando:

- [ ] `/coordenacao/missoes`: os contadores mostram 05 publicadas, 01 rascunho e 02 arquivadas.
- [ ] Criar uma ordem e clicar em **PUBLICAR**: a tela volta para a lista, e a OS-032 aparece em "PUBLICADAS".
- [ ] Recarregar a página (F5): a OS-032 continua lá.
- [ ] `/missoes` (paciente): a OS-032 aparece no quadro.
- [ ] Criar outra ordem com **SALVAR RASCUNHO**: ela aparece em "RASCUNHOS" e não aparece para o paciente.
- [ ] **ARQUIVAR** a OS-032: ela some do quadro do paciente.
- [ ] Tentar arquivar a OS-019: aparece a mensagem de ordem protegida.
- [ ] Tentar publicar sem título: aparece o erro, e nada é gravado.
- [ ] Rodar `npm run lint` e `npm run build` sem erros.

---

## Passo 9: Commit

```powershell
git add -A
```

```powershell
git commit -m "Salvar ordens de missão no MongoDB"
```

---

## Depois deste guia

- **Editar** uma ordem existente: hoje o botão EDITAR abre um editor em branco. Para corrigir, passe o código pela URL (`/coordenacao/missoes/editor?codigo=OS-031`), carregue a ordem do banco e use `updateOne` em vez de `insertOne`.
- **Autor**: trocar o `"Dr. ██████"` fixo pelo usuário logado, assim que o login (`jose` e `bcryptjs`) estiver pronto.
- **Conclusão de missão**: gravar o início e o fim no servidor, como prevê o comentário em `QuadroMissoes.tsx`, e somar `vezes` na ordem.
