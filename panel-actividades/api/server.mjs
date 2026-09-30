import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createServer } from 'node:http';

const directory = dirname(fileURLToPath(import.meta.url));
const databasePath = join(directory, 'db.json');
const port = Number(process.env.API_PORT ?? 3000);

async function readDatabase() {
  return JSON.parse(await readFile(databasePath, 'utf8'));
}

async function writeDatabase(database) {
  await writeFile(databasePath, `${JSON.stringify(database, null, 2)}\n`, 'utf8');
}

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(body === undefined ? undefined : JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    const match = url.pathname.match(/^\/actividades(?:\/(\d+))?$/);

    if (!match) {
      send(response, 404, { message: 'Ruta no encontrada.' });
      return;
    }

    const id = match[1] === undefined ? undefined : Number(match[1]);
    const database = await readDatabase();

    if (request.method === 'GET' && id === undefined) {
      const term = (url.searchParams.get('q') ?? '').trim().toLocaleLowerCase('es');
      const results = term
        ? database.actividades.filter((activity) => activity.task_title.toLocaleLowerCase('es').includes(term))
        : database.actividades;
      send(response, 200, results);
      return;
    }

    if (request.method === 'GET' && id !== undefined) {
      const activity = database.actividades.find((item) => item.id === id);
      send(response, activity ? 200 : 404, activity ?? { message: 'Actividad no encontrada.' });
      return;
    }

    if (request.method === 'POST' && id === undefined) {
      const body = await readBody(request);
      const nextId = database.actividades.reduce((largest, item) => Math.max(largest, item.id), 0) + 1;
      const created = { ...body, id: nextId };
      database.actividades.push(created);
      await writeDatabase(database);
      send(response, 201, created);
      return;
    }

    if (request.method === 'PUT' && id !== undefined) {
      const index = database.actividades.findIndex((item) => item.id === id);
      if (index < 0) {
        send(response, 404, { message: 'Actividad no encontrada.' });
        return;
      }
      const body = await readBody(request);
      database.actividades[index] = { ...body, id };
      await writeDatabase(database);
      send(response, 200, database.actividades[index]);
      return;
    }

    if (request.method === 'DELETE' && id !== undefined) {
      const index = database.actividades.findIndex((item) => item.id === id);
      if (index < 0) {
        send(response, 404, { message: 'Actividad no encontrada.' });
        return;
      }
      database.actividades.splice(index, 1);
      await writeDatabase(database);
      response.writeHead(204);
      response.end();
      return;
    }

    send(response, 405, { message: 'Método no permitido.' });
  } catch (error) {
    console.error(error);
    send(response, 400, { message: 'Solicitud inválida.' });
  }
});

server.listen(port, () => {
  console.log(`API disponible en http://localhost:${port}/actividades`);
});
