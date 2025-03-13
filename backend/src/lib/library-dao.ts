import * as mongo from 'mongodb';

import { Errors } from 'cs544-js-utils';

import * as Lib from './library.js';

//TODO: define any DB specific types if necessary
type Book = Lib.XBook;
type Lend = Lib.Lend;

export async function makeLibraryDao(dbUrl: string) {
  return await LibraryDao.make(dbUrl);
}

//options for new MongoClient()
const MONGO_OPTIONS = {
  ignoreUndefined: true,  //ignore undefined fields in queries
};


export class LibraryDao {

  //called by below static make() factory function with
  //parameters to be cached in this instance.
  constructor(private readonly client: mongo.MongoClient,
    private readonly books: mongo.Collection<Book>,
    private readonly bookCheckouts: mongo.Collection<Lend>) {
  }

  //static factory function; should do all async operations like
  //getting a connection and creating indexing.  Finally, it
  //should use the constructor to return an instance of this class.
  //returns error code DB on database errors.
  static async make(dbUrl: string): Promise<Errors.Result<LibraryDao>> {
    try {
      const client = await (new mongo.MongoClient(dbUrl, MONGO_OPTIONS)).connect();
      const db = client.db();
      const books = db.collection<Book>('books');
      await books.createIndex({ title: 'text', authors: 'text', });
      const bookCheckouts = db.collection<Lend>('bookCheckouts');

      return Errors.okResult(new LibraryDao(client, books, bookCheckouts));
    }
    catch (err) {
      return Errors.errResult((err as Error).message, 'DB');
    }
  }

  /** close off this DAO; implementing object is invalid after 
   *  call to close() 
   *
   *  Error Codes: 
   *    DB: a database error was encountered.
   */
  async close(): Promise<Errors.Result<void>> {
    try {
      await this.client.close();
      return Errors.VOID_RESULT;
    }
    catch (err) {
      return Errors.errResult((err as Error).message, 'DB');
    }
  }

  //add methods as per your API

  /** clear all data in this DAO.
 *
 *  Error Codes: 
 *    DB: a database error was encountered.
 */
  async clear(): Promise<Errors.Result<void>> {
    try {
      await this.books.deleteMany({});
      return Errors.VOID_RESULT;
    }
    catch (err) {
      return Errors.errResult((err as Error).message, 'DB');
    }
  }

  async add(book: Book): Promise<Errors.Result<Lib.XBook>> {
    try {
      const collection = this.books;
      await collection.insertOne(book);
    }
    catch (err) {
      return Errors.errResult((err as Error).message, 'DB');
    }
    return Errors.okResult(book);
  }

  async getByISBN(isbn: string): Promise<Errors.Result<Lib.XBook>> {
    try {
      const collection = this.books;
      const book = await collection.findOne({ isbn });
      if (book) {
        return Errors.okResult(book);
      } else {
        return Errors.errResult(`no book for isbn '${isbn}'`, { code: 'NOT_FOUND' });
      }
    }
    catch (err) {
      return Errors.errResult((err as Error).message, 'DB');
    }
  }

  async search(req: Record<string, any>): Promise<Errors.Result<Lib.XBook[]>> {
    try {
      const collection = this.books;
      const search: string = req.search;
      const cleanedSearch = search.split(' ').map(word => `"${word.replace(/[^a-zA-Z0-9 ]/g, '')}"`).join(' ');
      const index = req.index ?? 0;
      const count = req.count ?? 9999;

      const result = await collection.find(
        { $text: { $search: cleanedSearch } },
        { projection: { _id: 0 } } // Exclude _id field from the results
      )
        .sort({ title: 1 }) // Sort by title in ascending order
        .skip(index)
        .limit(count)
        .toArray()

      return Errors.okResult(result);
    }
    catch (err) {
      return Errors.errResult((err as Error).message, 'DB');
    }
  }

  async getCheckouts(patronId: string, isbn: string): Promise<Errors.Result<Lib.Lend>> {
    try {
      const collection = this.bookCheckouts;
      const book = await collection.findOne({ patronId, isbn });
      if (book) {
        const msg = `patron ${patronId} already has book ${isbn} checked out`;
        return Errors.errResult(msg, { code: 'BAD_REQ', widget: 'isbn' });
      } else {
        return Errors.okResult(book);
      }
    }
    catch (err) {
      return Errors.errResult((err as Error).message, 'DB');
    }
  }

  async getLendings(isbn: string): Promise<Errors.Result<Lib.Lend[]>> {
    try {
      const collection = this.bookCheckouts;
      // Find all records with the given ISBN
      const lendings = await collection.find({ isbn }).toArray();
      return Errors.okResult(lendings);
    } catch (err) {
      // Handle any errors that occur during the database operation
      return Errors.errResult((err as Error).message, 'DB');
    }
  }


  async checkout(lend: Lend): Promise<Errors.Result<Lib.Lend>> {
    try {
      const collection = this.bookCheckouts;
      await collection.insertOne(lend);
    }
    catch (err) {
      return Errors.errResult((err as Error).message, 'DB');
    }
    return Errors.okResult(lend);
  }

  async return(lend: Lend): Promise<Errors.Result<Lib.Lend>> {
    try {
      const collection = this.bookCheckouts;
      await collection.deleteOne(lend);
    }
    catch (err) {
      return Errors.errResult((err as Error).message, 'DB');
    }
    return Errors.okResult(lend);
  }

  async update(isbn: string, update: number) {
    try {
      const collection = this.books;
      await collection.updateOne(
        { isbn: isbn },
        { $inc: { nCopies: update } }
      );
    }
    catch (err) {
      return Errors.errResult((err as Error).message, 'DB');
    }
  }

} //class LibDao


