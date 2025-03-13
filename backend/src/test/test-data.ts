import Path from 'path';
import fs from 'fs';


import { Errors } from 'cs544-js-utils';
import { readJson } from 'cs544-node-utils';

const BOOKS = await getTestBooks(); //yeah for top-level awaits!!


export { BOOKS, };

//bit messy, but don't want to copy data;
//also, import json requires experimental import assertions
async function getTestBooks() {
  const dataPath = Path.resolve('../backend/data/books.json');
  console.log(dataPath);
  const booksData = fs.readFileSync(dataPath, 'utf8');
  const readResult = JSON.parse(booksData);
  return readResult as Record<string, any>[];
}
