import React, { Component } from "react";
import { NavLink } from "react-router-dom"
import QueryString from "query-string";
import * as scrollToElement from "scroll-to-element";
import { Alert } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faTimes } from "@fortawesome/free-solid-svg-icons";
import Api from "../libs/api";
import SearchParser from "../libs/researcher_search_lang";
import routes from "../routes";
import ResearcherResult from "./ResearcherResult";
import { removeStopwords, eng } from 'stopword'

class Researchers extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchQuery: "",
      searchQueryWords: [],
      searchQueryError: null,
      queryResults: null,
      filteredQueryResults: null,
      queryResultCounties: null,
      countyFilter: "null",
      currentPage: 1,
      totalPages: 1,
      pageSize: 10,
      showResult: false,
    };
    this.setPage = this.setPage.bind(this);
    this.setPageSize = this.setPageSize.bind(this);
    this.setSearchQuery = this.setSearchQuery.bind(this);
    this.setCountyFilter = this.setCountyFilter.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.setSortBy = this.setSortBy.bind(this)
  }

  setPage(newPage) {
    this.setState({
      currentPage: newPage,
    });
    // scroll to top (not working
    // scrollToElement("#results");
  }

  setPageSize(newPageSize) {
    newPageSize = parseInt(newPageSize);
    this.setState({
      pageSize: newPageSize,
      totalPages: Math.ceil(
        this.state.filteredQueryResults.length / newPageSize
      ),
      currentPage: 1,
    });
  }

  setSearchQuery(newQuery, autoSearch) {
    this.setState(
      {
        searchQuery: newQuery,
      },
      () => (autoSearch ? this.handleSearch() : null)
    );
  }

  setCountyFilter(county) {
    if (county) {
      if (county === "All") {
        this.setState({
          filteredQueryResults: this.state.queryResults,
          countyFilter: "null",
          currentPage: 1,
          totalPages: Math.ceil(
            this.state.queryResults.length / this.state.pageSize
          ),
        });
      } else {
        // filter down to current county
        const filteredResults = this.state.queryResults.filter(
          (a) => a.name === county
        );
        this.setState({
          filteredQueryResults: filteredResults,
          countyFilter: county,
          currentPage: 1,
          totalPages: Math.ceil(filteredResults.length / this.state.pageSize),
        });
      }
    } else {
      // disable filter
      this.setState({
        filteredQueryResults: this.state.queryResults,
        countyFilter: "null",
        currentPage: 1,
        totalPages: Math.ceil(
          this.state.queryResults.length / this.state.pageSize
        ),
      });
    }
  }

  setSortBy(newSort) {
    if (newSort) {
      if (newSort === "bestMatch") {
        // sort by rank and number of sentences (if ranks are equal)
        let temp = this.state.queryResults;
        temp.sort((a, b) => {
          if (a.rank < b.rank) {
            return -1;
          }
          if (a.rank > b.rank) {
            return 1;
          }
          if (a.sentences.length > b.sentences.length) {
            return -1;
          }
          if (a.sentences.length < b.sentences.length) {
            return 1;
          }
          return 0;
        });
        this.setState({
          filteredQueryResults: temp,
          currentPage: 1,
          sortBy: "bestMatch"
        });
      } else if (newSort === "Alphabetical") {
        // sort alphabetically on municipality name
        let temp = this.state.queryResults;
        temp.sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          }
          if (a.name > b.name) {
            return 1;
          }
          return 0;
        });
        this.setState({
          filteredQueryResults: temp,
          currentPage: 1,
          sortBy: "Alphabetical"
        });
      }
    }
  }

  handleSearch(event) {
    if (event) {
      event.preventDefault();
    }

    // parse query
    try {
      // Defines function to remove quotation marks from the search string
      function getQueryWords(query) {
        if (typeof query === "string") {
          // Patrick Gavazzi: removes quotation marks from search string for highlighting
          query = query.replace(/['"]+/g, "")

          let lowerQuery = query.toLowerCase().split(" ")
          let newQuery = removeStopwords(lowerQuery, eng)
          
          // If user input query is constructed solely of stop words, set query to original input
          query = (newQuery.length == 0) ? query : newQuery.join(" ")

          return [query.trim()]

        } else {
          throw 'Query is not a string';
        }
      }

      //const searchQuery = SearchParser.parse(this.state.searchQuery);
      const searchQuery = '"' + getQueryWords(this.state.searchQuery)[0] + '"';
      // parse down to just the words being searched for, for highlighting
      const searchQueryWords = getQueryWords(searchQuery);


      Api.getResearcherSearchResults(searchQuery).then((resp) => {
        resp = removeDuplicates(resp)
        // parse states out
        const respCounties = [...new Set(resp.map((a) => a.name))];
        this.setState({
          //queryResults is set to the response for views.py ResearcherSearchList()
          queryResults: resp,
          filteredQueryResults: resp,
          queryResultCounties: respCounties,
          searchQueryError: null,
          searchQueryWords: searchQueryWords,
          countyFilter: "null",
          totalPages: Math.ceil(resp.length / this.state.pageSize),
          showResult: true,
          //set defult search to be by best match
          sortBy: "bestMatch"
        });
      });

      // Helper function to clean response object from database result
      // Removes duplicate contracts while keeping the one with the highest "rank"
      function removeDuplicates(resp) {
        let ids = [...new Set(resp.map(item => item.id))]
        let ret = []
        ids.forEach((id) => {
          let candidates = resp.filter(contract => contract.id == id)
          candidates.sort((a, b) => {
            if (a.rank < b.rank) {
              return -1;
            }
            if (a.rank > b.rank) {
              return 1;
            }
            return 0;
          });
          ret.push(candidates[0])
        })
        return ret
      }

      // TODO: Modify this URLSearchParam to allow for selection of location
      // will also then need to modify API, and Python method (and possible urls.py)
      // set search query param
      this.props.history.push({
        pathname: routes.researchers,
        search:
          "?" +
          new URLSearchParams({ search: this.state.searchQuery, }).toString(),
      });
    } catch (err) {
      if (err instanceof SearchParser.SyntaxError) {
        this.setState({
          searchQueryError: err,
        });
      } else {
        throw err;
      }
    }
  }

  /* Accessor methods added for testing suite
  getPageSize(){
    return this.state.pageSize;
  }

  getSearchQuery(){
    return this.state.searchQuery;
  }

  getCountyFilter(){
    return this.state.countyFilter;
  }

  getSearchQueryWords(){
    return this.state.searchQueryWords;
  }
*/
  componentDidMount() {
    const queryParams = QueryString.parse(this.props.location.search);
    // if search already set, use it
    if (queryParams.search) {
      this.setSearchQuery(queryParams.search, true);
    }
    // current working solution to get page to scroll to the top when loaded
    window.scrollTo(0, 0);
  }

  render() {
    return (
      <div className="row mt-3">
        <div className="col-lg-12">
        <h3 style={{ color: 'darkblue', fontWeight: 700, marginTop: 40 }}>
            Search Police Contracts
          </h3>
          {/* Removed Banner <div
            class="topimage"
          > {/* Removed className="jumbotron" */}
            {/* figure out a better way to add in the spaces */} {/*
            <br />
            <br />
            <br />
          </div> */}
          <br />
          <br />
          <br />
          <br />
          <h4 style={{textAlign: "center"}}> <b> Find Matching Text </b> </h4>
          <div className="col-md-6 offset-md-3">
            <form onSubmit={(e) => this.handleSearch(e)}>
              <div className="input-group">
                <input
                  type="text"
                  className={`form-control input-lg ${
                    this.state.searchQueryError ? "border-danger" : ""
                  }`}
                  placeholder="Search Query..."
                  value={this.state.searchQuery}
                  onChange={(event) =>
                    this.setSearchQuery(event.target.value, false)
                  }
                />
                <div className="input-group-append">
                  <button className="btn btn-outline-primary" type="submit">
                    <FontAwesomeIcon icon={faSearch} />
                  </button>
                </div>
              </div>
              {this.state.searchQueryError && (
                <p className="text-danger text-center">
                  This search query is invalid
                </p>
              )}
            </form>
          </div>
        </div>
        <div className="col-lg-12 mt-1">
          <div
            className="col-md-6 offset-md-3 text-secondary"
            style={{ backgroundColor: "#f9f9f9", padding: "10px"}}
          >
            <li className="nav-item nav-link">
              <h5>How to use the search bar: </h5> Enter a phrase you wish to find in the police employment contracts (for example: "disciplinary action"). We will display the contracts with the closest match.
                <br />
                <br /> 
              Below are some keyword suggestions. (<NavLink className={isActive =>"nav-link" + (!isActive ? " unselected" : "")}to={routes.commentary} activeStyle={{ color: 'red', borderBottomWidth: '2px' }}>Why are these words important?</NavLink>)
                <br />
              This <a target="_blank" href='/static/app/instructions/How_to_read_a_contract.pdf'>brief guide</a> may also be helpful.
            </li>   
          </div>
          <div className="mt-2 text-center">
            <div className="btn-group" role="group" aria-label="...">
              <button
                type="button"
                onClick={() => this.setSearchQuery("unfounded", true)}
                className="ex-keyword btn btn-info btn-rounded mr-2"
              >
                unfounded
              </button>
              <button
                type="button"
                onClick={() => this.setSearchQuery("interview", true)}
                className="ex-keyword btn btn-info btn-rounded mr-2"
              >
                interview
              </button>
              <button
                type="button"
                onClick={() => this.setSearchQuery("interrogation", true)}
                className="ex-keyword btn btn-info btn-rounded mr-2"
              >
                interrogation
              </button>
              <button
                type="button"
                onClick={() => this.setSearchQuery("false arrest", true)}
                className="ex-keyword btn btn-info btn-rounded mr-2"
              >
                false arrest
              </button>
              <button
                type="button"
                onClick={() => this.setSearchQuery("reprimand", true)}
                className="ex-keyword btn btn-info btn-rounded mr-2"
              >
                reprimand
              </button>
              <button
                type="button"
                onClick={() => this.setSearchQuery("public comment", true)}
                className="ex-keyword btn btn-info btn-rounded"
              >
                public comment
              </button>
            </div>
          </div>
        </div>
        <div>
          <br />
          <br />
          <br />
          <br />
          <br />
        </div>
        <div></div>
        {this.state.filteredQueryResults && (
          <div className="col-lg-12">
            {this.state.queryResultCounties && (
              <div className="col-lg-12 mt-3 row">
                <div className="col-md-3">
                  <div className="input-group">
                    <select
                      className="custom-select"
                      value={this.state.countyFilter}
                      onChange={(e) => this.setCountyFilter(e.target.value)}
                    >
                      <option value="null" disabled>
                        Filter by Municipality
                      </option>
                      <option key="All">All</option>
                      {this.state.queryResultCounties.map((result) => (
                        <option key={result}>{result}</option>
                      ))}
                    </select>
                    <div className="input-group-append">
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => this.setCountyFilter()}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <select
                    className="custom-select"
                    value={this.state.sortBy}
                    onChange={(e) => this.setSortBy(e.target.value)}
                  >
                    <option value="null" disabled>
                      Sort by...
                    </option>
                    <option value="bestMatch">Best Match</option>
                    <option value="Alphabetical">Alphabetical</option>
                  </select>
                </div>
                <div className="col-md-3 offset-md-3">
                  <select
                    className="custom-select"
                    defaultValue="null"
                    onChange={(e) => this.setPageSize(e.target.value)}
                  >
                    <option value="null" disabled>
                      Results per Page
                    </option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>
            )}
            <div className="col-lg-12 mt-3" id="results">
              <h2>Results</h2>
              <hr className="my-4 border-top border-secondary" />
              {this.state.queryResults && (
                <div>
                  <h4>
                    {this.state.filteredQueryResults.length} Results found!
                  </h4>
                </div>
              )}
            </div>
            <div className="col-lg-12 mt-3">
              {this.state.filteredQueryResults.length === 0 && (
                <p className="text-center lead">
                  Sorry, it appears there are no results for this search!
                </p>
              )}
              {this.state.filteredQueryResults
                .slice(
                  this.state.pageSize * (this.state.currentPage - 1),
                  this.state.pageSize * this.state.currentPage
                )
                .map((result) => (
                  <ResearcherResult
                    result={result}
                    searchQueryWords={this.state.searchQueryWords}
                    key={result.id}
                  />
                ))}
              {this.state.filteredQueryResults.length > 0 && (
                <div className="col-lg-12">
                  <nav aria-label="Result navigation">
                    <ul className="pagination justify-content-center">
                      {this.state.currentPage - 1 > 0 && (
                        <li>
                          <a
                            className="page-link"
                            aria-label="Previous"
                            onClick={() =>
                              this.setPage(this.state.currentPage - 1)
                            }
                          >
                            <span aria-hidden="true">&laquo;</span>
                          </a>
                        </li>
                      )}
                      {this.state.currentPage - 2 > 0 && (
                        <li
                          className="page-item"
                          onClick={() =>
                            this.setPage(this.state.currentPage - 2)
                          }
                        >
                          <a className="page-link">
                            {this.state.currentPage - 2}
                          </a>
                        </li>
                      )}
                      {this.state.currentPage - 1 > 0 && (
                        <li
                          className="page-item"
                          onClick={() =>
                            this.setPage(this.state.currentPage - 1)
                          }
                        >
                          <a className="page-link">
                            {this.state.currentPage - 1}
                          </a>
                        </li>
                      )}
                      <li className="page-item active">
                        <a className="page-link">{this.state.currentPage}</a>
                      </li>
                      {this.state.currentPage + 1 <= this.state.totalPages && (
                        <li
                          className="page-item"
                          onClick={() =>
                            this.setPage(this.state.currentPage + 1)
                          }
                        >
                          <a className="page-link">
                            {this.state.currentPage + 1}
                          </a>
                        </li>
                      )}
                      {this.state.currentPage + 2 <= this.state.totalPages && (
                        <li
                          className="page-item"
                          onClick={() =>
                            this.setPage(this.state.currentPage + 2)
                          }
                        >
                          <a className="page-link">
                            {this.state.currentPage + 2}
                          </a>
                        </li>
                      )}
                      {this.state.currentPage + 1 <= this.state.totalPages && (
                        <li className="page-item">
                          <a
                            className="page-link"
                            aria-label="Next"
                            onClick={() =>
                              this.setPage(this.state.currentPage + 1)
                            }
                          >
                            <span aria-hidden="true">&raquo;</span>
                          </a>
                        </li>
                      )}
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
}
export default Researchers;
