import { Errors } from 'cs544-js-utils';

import { LibraryDao } from './library-dao.js';
import * as Lib from './library.js';

/** Note that errors are documented using the `code` option which must be
 *  returned (the `message` can be any suitable string which describes
 *  the error as specifically as possible).  Whenever possible, the
 *  error should also contain a `widget` option specifying the widget
 *  responsible for the error).
 *
 *  Note also that the underlying DAO should not normally require a
 *  sequential scan over all books or patrons.
 */


/************************ Main Implementation **************************/

export function makeLendingLibrary(dao: LibraryDao) {
  return new LendingLibrary(dao);
}

export class LendingLibrary {
  
  constructor(private readonly dao: LibraryDao) {
  }

  /** clear out underlying db */
  async clear(): Promise<Errors.Result<void>> {
    try {
      await this.dao.clear();
      return Errors.VOID_RESULT;
    }
    catch (err) {
      return Errors.errResult((err as Error).message, 'DB');
    }
  }

  /** Add one-or-more copies of book represented by req to this library.
   *  If the book is already in the library and consistent with the book
   *  being added, then the nCopies of the book is simply updated by
   *  the nCopies of the object being added (default 1).
   *
   *  Errors:
   *    MISSING: one-or-more of the required fields is missing.
   *    BAD_TYPE: one-or-more fields have the incorrect type.
   *    BAD_REQ: other issues, like:
   *      "nCopies" or "pages" not a positive integer.
   *      "year" is not integer in range [1448, currentYear]
   *      "isbn" is not in ISBN-10 format of the form ddd-ddd-ddd-d
   *      "title" or "publisher" field is empty.
   *      "authors" array is empty or contains an empty author
   *      book is already in library but data in req is 
   *      inconsistent with the data already present.
   */
  async addBook(req: Record<string, any>): Promise<Errors.Result<Lib.XBook>> {
    // book validation
    const chk = Lib.validate<Lib.Book>('addBook', req);
    if (!chk.isOk) return chk;
    const book = chk.val;
    // defualt nCopies to 1 if empty
    if (!book.nCopies) book.nCopies = 1;
    const getResult = await this.dao.getByISBN(req.isbn);
    // if there is a book with the same ISBN in the database
    if (getResult.isOk === true) {
      const badField = compareBook(book, getResult.val);
      if (badField) {
        const msg = `inconsistent ${badField} data for book ${req.isbn}`;
        return Errors.errResult(msg, { code: 'BAD_REQ', widget: badField });
      }
      // add nCopies to existing book
      getResult.val.nCopies += book.nCopies;
      await this.dao.add(getResult.val);
      return Errors.okResult(getResult.val);
    }
    // there isn't a book with the same ISBN -> add a new book
    await this.dao.add(book);
    return Errors.okResult(book);
  }

  async getBook(isbn: string): Promise<Errors.Result<Lib.XBook>> {
    // Validate ISBN format or any other checks
    if (!isbn || typeof isbn !== 'string') {
      return Errors.errResult('Invalid ISBN format', { code: 'BAD_REQ' });
    }
  
    // Fetch the book from the database using the DAO
    const result = await this.dao.getByISBN(isbn);
  
    if (result.isOk) {
      // Book found, return the book
      return Errors.okResult(result.val);
    } else {
      // Book not found, return an error
      return Errors.errResult(`Book with ISBN ${isbn} not found`, { code: 'NOT_FOUND' });
    }
  }

  /** Return all books whose authors and title fields contain all
   *  "words" in req.search, where a "word" is a max sequence of /\w/
   *  of length > 1.  Note that word matching must be case-insensitive,
   *  but can depend on any stemming rules of the underlying database.
   *  
   *  The req can optionally contain non-negative integer fields
   *  index (default 0) and count (default DEFAULT_COUNT).  The
   *  returned results are a slice of the sorted results from
   *  [index, index + count).  Note that this slicing *must* be
   *  performed by the database.
   *
   *  Returned books should be sorted in ascending order by title.
   *  If no books match the search criteria, then [] should be returned.
   *
   *  Errors:
   *    MISSING: search field is missing
   *    BAD_TYPE: search field is not a string or index/count are not numbers.
   *    BAD_REQ: no words in search, index/count not int or negative.
   */
  async findBooks(req: Record<string, any>): Promise<Errors.Result<Lib.XBook[]>> {
    const chk = Lib.validate<Lib.Find>('findBooks', req);
    if (!chk.isOk) return Errors.errResult(chk);
    return await this.dao.search(req);
  }


  /** Set up patron req.patronId to check out book req.isbn. 
   * 
   *  Errors:
   *    MISSING: patronId or isbn field is missing
   *    BAD_TYPE: patronId or isbn field is not a string.
   *    BAD_REQ: invalid isbn or error on business rule violation, like:
   *      isbn does not specify a book in the library
   *      no copies of the book are available for checkout
   *      patron already has a copy of the same book checked out
   */
  async checkoutBook(req: Record<string, any>): Promise<Errors.Result<void>> {
    /*
      req: isbn, patronId
      1. validate req using Lib.validate<Lib.Lend>("checkoutBook", req);
      2. get book using const book = await this.dao.getByISBN(req.isbn);
        a. if no book (getResult.isOk === false) -> BAD_REQ
      3. check if book has enough copies -> BAD_REQ
      4. check if patron already has same book checked out
      5. if all checks pass, add new patronCheckouts[patronId] ?? = [];
                                     patronCheckouts[patronId].push(isbn)
      6. lower copies of books by one
    */
    const chk = Lib.validate<Lib.Lend>('checkoutBook', req);
    if (!chk.isOk) return Errors.errResult(chk);
    const lend = chk.val;
    const book = await this.dao.getByISBN(req.isbn);
    if (book.isOk === false) {
      const msg = `no book for isbn '${req.isbn}'`;
      return Errors.errResult(msg, { code: 'BAD_REQ', widget: 'isbn' });
    }
    if (book.val.nCopies < 1) {
      const msg = `not enough copies for book '${req.isbn}'`;
      return Errors.errResult(msg, { code: 'BAD_REQ', widget: 'isbn' });
    }
    const getResult = await this.dao.getCheckouts(req.patronId, req.isbn);
    if (getResult.isOk === false) {
      return getResult;
    }
    await this.dao.checkout(lend);
    await this.dao.update(req.isbn, -1);
    return Errors.VOID_RESULT;
  }

  async findLendings(req: Record<string, any>): Promise<Errors.Result<Lib.Lend[]>> {
      return await this.dao.getLendings(req.isbn);
  }

  /** Set up patron req.patronId to returns book req.isbn.
   *  
   *  Errors:
   *    MISSING: patronId or isbn field is missing
   *    BAD_TYPE: patronId or isbn field is not a string.
   *    BAD_REQ: invalid isbn or error on business rule violation like
   *    isbn does not specify a book in the library or there is
   *    no checkout of the book by patronId.
   */
  async returnBook(req: Record<string, any>): Promise<Errors.Result<void>> {
    const chk = Lib.validate<Lib.Lend>('checkoutBook', req);
    if (!chk.isOk) return Errors.errResult(chk);
    const lend = chk.val;
    const book = await this.dao.getByISBN(req.isbn);
    if (book.isOk === false) {
      const msg = `no book for isbn '${req.isbn}'`;
      return Errors.errResult(msg, { code: 'BAD_REQ', widget: 'isbn' });
    }
    const getResult = await this.dao.getCheckouts(req.patronId, req.isbn);
    if (getResult.isOk === true) {
      const msg = `patron ${req.patronId} does not have book ${req.isbn} checked out`;
      return Errors.errResult(msg, { code: 'BAD_REQ', widget: 'isbn' });
    }
    await this.dao.return(lend);
    await this.dao.update(req.isbn, 1);
    return Errors.VOID_RESULT;
  }

  //add class code as needed

}

// default count for find requests
const DEFAULT_COUNT = 5;

//add file level code as needed


/********************** Domain Utility Functions ***********************/

/** return a field where book0 and book1 differ; return undefined if
 *  there is no such field.
 */
function compareBook(book0: Lib.Book, book1: Lib.Book): string | undefined {
  if (book0.title !== book1.title) return 'title';
  if (book0.authors.some((a, i) => a !== book1.authors[i])) return 'authors';
  if (book0.pages !== book1.pages) return 'pages';
  if (book0.year !== book1.year) return 'year';
  if (book0.publisher !== book1.publisher) return 'publisher';
}


