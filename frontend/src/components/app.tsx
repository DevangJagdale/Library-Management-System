import React, { useState } from 'react';

//types defined in library.ts in earlier projects
import * as Lib from '../lib/library';

import { makeLibraryWs, LibraryWs } from '../lib/library-ws.js';

type AppProps = {
  wsUrl: string
};

export function App(props: AppProps) {

  const { wsUrl } = props;

  const ws = makeLibraryWs(wsUrl);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [nextLink, setNextLink] = useState(null);
  const [prevLink, setPrevLink] = useState(null);
  const [book, setBook] = useState(null);
  const [patronId, setPatronId] = useState('');
  const [borrowers, setBorrowers] = useState([]);
  const [errors, setErrors] = useState([]);

  // New state for adding a book
  const [newBook, setNewBook] = useState({
    isbn: '',
    title: '',
    year: '',
    authors: '',
    pages: '',
    publisher: '',
    nCopies: '',
  });

  const handleAddBook = async () => {
    setErrors([]);
    console.log(newBook);
    console.error(newBook.year);
    const bookDetails = {
      isbn: newBook.isbn,
      title: newBook.title,
      year: parseInt(newBook.year),
      authors: newBook.authors.split(',').map((author) => author.trim()), // Convert to an array
      pages: parseInt(newBook.pages, 10),
      publisher: newBook.publisher,
      nCopies: parseInt(newBook.nCopies, 10),
    };

    const result = await ws.addBook(bookDetails);
    if (result.isOk === true) {
      alert('Book added successfully!');
      setNewBook({ isbn: '', title: '', year: '', authors: '', pages: '', publisher: '', nCopies: '' });
    } else {
      setErrors(result.errors);
    }
  };

  const fetchBooksByUrl = async (url: string | URL) => {
    const result = await ws.findBooksByUrl(url);
    if (result.isOk === true) {
      const { result: searchResults, links } = result.val;
      setResults(searchResults);
      setNextLink(links.next?.href || null);
      setPrevLink(links.prev?.href || null);
    } else {
      setErrors(result.errors);
    }
  };

  const handleBlur = async () => {
    setErrors([]);
    setBook(null);
    const url = new URL(wsUrl + '/api/books');
    url.searchParams.set('search', searchQuery);
    await fetchBooksByUrl(url);
  };

  const handleDetails = async (url: string | URL) => {
    setErrors([]);
    const result = await ws.getBookByUrl(url);
    if (result.isOk === true) {
      setResults([]);
      setNextLink(null);
      setPrevLink(null);
      setBook(result.val.result);
      updateBorrowers(result.val.result.isbn);
    } else {
      setErrors(result.errors);
    }
  }

  const handleSubmit = async () => {
    setErrors([]);
    const lend: Lib.Lend = {
      isbn: book.isbn,
      patronId: patronId
    };
    const result = await ws.checkoutBook(lend);
    if (result.isOk === true) {
      updateBorrowers(book.isbn);
    } else {
      setErrors(result.errors);
    }
  }

  const updateBorrowers = async (isbn: string) => {
    setErrors([]);
    setBorrowers([]);
    const result = await ws.getLends(isbn);
    if (result.isOk === true) {
      setBorrowers(result.val);
    } else {
      setErrors(result.errors);
    }
  }

  const returnBook = async (isbn: string, patronId: string) => {
    setErrors([]);
    const lend: Lib.Lend = {
      isbn: isbn,
      patronId: patronId
    };
    const result = await ws.returnBook(lend);
    if (result.isOk === true) {
      updateBorrowers(isbn);
    } else {
      setErrors(result.errors);
    }
  }

  return (
    <div>
      <ul id="errors">
        {errors.map((error, index) => (
          <li key={index} className="error">{error.message}</li>
        ))}
      </ul>

      <form className="grid-form">
        <label htmlFor="search">Search</label>
        <span>
          <input
            id="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onBlur={handleBlur}
          /> <br />
          <span className="error" id="search-error"></span>
        </span>
      </form>


      {/* Add Book Form */}
      <div>
        <h3>Add a New Book</h3>
        <form className="grid-form">
          <label htmlFor="isbn">ISBN</label>
          <input
              id="isbn"
              value={newBook.isbn}
              onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
          />

          <label htmlFor="title">Title</label>
          <input
              id="title"
              value={newBook.title}
              onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
          />

          <label htmlFor="year">Year</label>
          <input
              id="year"
              type="number"
              value={newBook.year}
              onChange={(e) => setNewBook({ ...newBook, year: e.target.value })}
          />

          <label htmlFor="authors">Authors (comma-separated)</label>
          <input
              id="authors"
              value={newBook.authors}
              onChange={(e) => setNewBook({ ...newBook, authors: e.target.value })}
          />

          <label htmlFor="pages">Pages</label>
          <input
              id="pages"
              type="number"
              value={newBook.pages}
              onChange={(e) => setNewBook({ ...newBook, pages: e.target.value })}
          />

          <label htmlFor="publisher">Publisher</label>
          <input
              id="publisher"
              value={newBook.publisher}
              onChange={(e) => setNewBook({ ...newBook, publisher: e.target.value })}
          />

          <label htmlFor="nCopies">Number of Copies</label>
          <input
              id="nCopies"
              type="number"
              value={newBook.nCopies}
              onChange={(e) => setNewBook({ ...newBook, nCopies: e.target.value })}
          />

          <button type="button" onClick={handleAddBook}>Add Book</button>
        </form>
      </div>

      <div id="result">
        {(prevLink || nextLink) && (
          <div className="scroll">
            {prevLink && (
              <a rel="prev" onClick={() => fetchBooksByUrl(prevLink)}> {'<<'} </a>
            )}
            {nextLink && (
              <a rel="next" onClick={() => fetchBooksByUrl(nextLink)}> {'>>'} </a>
            )}
          </div>
        )}

        {results.length > 0 && (
          <ul id="search-results">
            {results.map((linkedResult, index) => (
              <li key={index}>
                <span className="content">{linkedResult.result.title}</span>
                <a className="details" href="#!" onClick={() => {
                  handleDetails(linkedResult.links.self.href)
                }}>details...</a>
              </li>
            ))}
          </ul>
        )}

        {(prevLink || nextLink) && (
          <div className="scroll">
            {prevLink && (
              <a rel="prev" onClick={() => fetchBooksByUrl(prevLink)}> {'<<'} </a>
            )}
            {nextLink && (
              <a rel="next" onClick={() => fetchBooksByUrl(nextLink)}> {'>>'} </a>
            )}
          </div>
        )}

        {book && (
          <div>
            <dl className="book-details">
              <dt>ISBN</dt>
              <dd>{book.isbn}</dd>
              <dt>Title</dt>
              <dd>{book.title}</dd>
              <dt>Authors</dt>
              <dd>{book.authors.join('; ')}</dd>
              <dt>Number of Pages</dt>
              <dd>{book.pages}</dd>
              <dt>Publisher</dt>
              <dd>{book.publisher}</dd>
              <dt>Number of Copies</dt>
              <dd>{book.nCopies}</dd>
              <dt>Borrowers</dt>
              <dd id="borrowers">
                {borrowers.length === 0 ? (
                  'None'
                ) : (
                  <ul>
                    {borrowers.map((linkedResult, index) => (
                      <li key={index}>
                        <span className="content">{linkedResult.patronId}</span>
                        <button className="return-book" onClick={(e) => {
                          e.preventDefault(),
                          returnBook(book.isbn, linkedResult.patronId)
                        }}>Return Book</button>
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </dl>

            <form
              className="grid-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <label htmlFor="patronId">Patron ID</label>
              <span>
                <input
                  id="patronId"
                  value={patronId}
                  onChange={(e) => setPatronId(e.target.value)}
                /> <br />
                <span className="error" id="patronId-error"></span>
              </span>
              <button type="submit">Checkout Book</button>
            </form>
          </div>
        )}
      </div>
    </div>

  );
}
