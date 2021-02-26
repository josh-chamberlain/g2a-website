import React, { Component } from "react";
import LeaderLine from "leader-line";
import * as scrollToElement from "scroll-to-element";
import CitizenInfoPanel from "./CitizenInfoPanel";
import Api from "../libs/api";
import { useParams } from "react-router-dom";

class Citizens extends Component {
  constructor(props) {
    super(props);
    this.state = {
      locations: {},
      location: null,
      locationQuestions: null,
      curStage: null,
	    leaderLines: []
    };
	  this.drawLeaderLines = this.drawLeaderLines.bind(this);
	  this.getLocationQuestions = this.getLocationQuestions.bind(this);
    this.handleLocationSelect = this.handleLocationSelect.bind(this);
    this.handleIconClick = this.handleIconClick.bind(this);
  }

	drawLeaderLines() {
		// given a flow chat element returns the underlying circle element SVG
		const getCircle = (element) =>
			element.children[0].children[0].children[0];
		const leaderLineConfig = { color: "#337ab7" };
		const lines = [
			["pre-complaintIcon", "complaintIcon"],
			["complaintIcon", "reviewIcon"],
			["reviewIcon", "investigationIcon"],
			["investigationIcon", "resultIcon"],
		];
		const leaderLines = [];
		for (let line of lines) {
			leaderLines.push(new LeaderLine(
				getCircle(document.getElementById(line[0])),
				getCircle(document.getElementById(line[1])),
				leaderLineConfig
			));
		}
		this.setState({
			leaderLines: leaderLines
		});
	}

	getLocationQuestions() {
		Api.getLocationQuestions(this.state.location.id).then((resp) => {
			const questionsByCat = {}
			for (let question of resp) {
				for (let cat of question.categories) {
					const catName = cat.name.toLowerCase();
					if (questionsByCat[catName]) {
						questionsByCat[catName].push(question);
					}
					else {
						questionsByCat[catName] = [question];
					}
				}
			}
			this.setState({
				locationQuestions: questionsByCat,
			});
		});
	}

  handleLocationSelect(location) {
    // update current selected location
    this.setState({
      location: location,
    }, () => this.getLocationQuestions());
  }

  handleIconClick(category) {
    this.setState({
	    curStage: category
    }, () => scrollToElement("#citizenInfoPanel"));
  }

  componentDidMount() {
    // load available locations
    Api.getLocations().then((resp) => {
      const locationsByState = {};
      for (let loc of resp) {
        if (locationsByState[loc.state]) {
          locationsByState[loc.state].push(loc);
        } else {
          locationsByState[loc.state] = [loc];
        }
      }
	    // check if preset location
	    const { lid } = this.props.match.params;
	    let location = null;
	    // if set try to find it
	    if (lid) {
		    location = resp.find(loc => loc.id == lid);
	    }
	    else {
		    // default to Pittsburgh
		    location = resp.find(loc => loc.name == "Pittsburgh");
	    }
      this.setState({
        locations: locationsByState,
	      location: location
      }, () => {
	      this.drawLeaderLines();
	      this.getLocationQuestions();
      });
    });
  }

	componentWillUnmount() {
		// remove leader lines
		for (let leaderLine of this.state.leaderLines) {
			leaderLine.remove();
		}
	}

  render() {
    return (
      <div className="container-fluid">
        <div className="dropdown text-center">
          <button
            className="btn btn-default dropdown-toggle"
            type="button"
            id="dropdownMenu1"
            data-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="true"
            style={{ margin: "10px auto" }}
          >
            Choose a state&nbsp;&nbsp;
            <span className="caret"></span>
          </button>
          <ul
            className="dropdown-menu multi-level"
            aria-labelledby="dropdownMenu1"
            style={{
              margin: "10px auto",
              width: "200px",
              left: "50%",
              marginLeft: "-100px",
            }}
          >
            {Object.entries(this.state.locations).map(([state, cities]) => (
              <li key={state} className="dropdown-submenu">
                <a href="#">{state}</a>
                <ul className="dropdown-menu">
                  {cities.map((city) => (
                    <li key={city.id}>
                      <a
                        tabIndex="-1"
                        onClick={() => this.handleLocationSelect(city)}
                      >
                        {city.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
        <div className="jumbotron">
          <h1>{this.state.location && this.state.location.name}</h1>
          <p className="lead">
            This tool highlights the phases involved in the process of filing a
            police complaint. Click on a circle to learn more about that
            particular phase. Disclaimer: All the information presented with
            this tool was found on the OMI and CPRB websites.
          </p>
        </div>
        <div className="row">
          <div className="col-md-2 col-md-offset-1 mb-5">
            <div className="row">
              <div
                className="text-center flow-stage col-xs-6 col-lg-12"
                id="pre-complaintIcon"
                onClick={() => this.handleIconClick("pre-complaint")}
              >
                <span className="fa-stack fa-5x">
                  <i
                    id="pre-complaintCircle"
                    className="fas fa-circle fa-stack-2x flow-circle"
                  ></i>
                  <i className="fas fa-users fa-stack-1x fa-inverse"></i>
                </span>
              </div>
              <h2 className="text-center flow-stage-text col-xs-6 col-lg-12">
                Interaction
              </h2>
            </div>
          </div>
          <div className="col-md-2 mb-5">
            <div className="row">
              <div
                className="text-center flow-stage col-xs-6 col-lg-12"
                id="complaintIcon"
                onClick={() => this.handleIconClick("complaint")}
              >
                <span className="fa-stack fa-5x">
                  <i
                    id="complaintCircle"
                    className="fas fa-circle fa-stack-2x flow-circle"
                  ></i>
                  <i className="fas fa-exclamation-circle fa-stack-1x fa-inverse"></i>
                </span>
              </div>
              <h2 className="text-center flow-stage-text col-xs-6 col-lg-12">
                Complaint
              </h2>
            </div>
          </div>
          <div className="col-md-2 mb-5">
            <div className="row">
              <div
                className="text-center flow-stage col-xs-6 col-lg-12"
                id="reviewIcon"
                onClick={() => this.handleIconClick("review")}
              >
                <span className="fa-stack fa-5x">
                  <i
                    id="reviewCircle"
                    className="fas fa-circle fa-stack-2x flow-circle"
                  ></i>
                  <i className="fas fa-edit fa-stack-1x fa-inverse"></i>
                </span>
              </div>
              <h2 className="text-center flow-stage-text col-xs-6 col-lg-12">
                Review
              </h2>
            </div>
          </div>
          <div className="col-md-2 mb-5">
            <div className="row">
              <div
                className="text-center flow-stage col-xs-6 col-lg-12"
                id="investigationIcon"
                onClick={() => this.handleIconClick("investigation")}
              >
                <span className="fa-stack fa-5x">
                  <i
                    id="investigationCircle"
                    className="fas fa-circle fa-stack-2x flow-circle"
                  ></i>
                  <i className="fas fa-search fa-stack-1x fa-inverse"></i>
                </span>
              </div>
              <h2 className="text-center flow-stage-text col-xs-6 col-lg-12">
                Investigation
              </h2>
            </div>
          </div>
          <div className="col-md-2 mb-5">
            <div className="row">
              <div
                className="text-center flow-stage col-xs-6 col-lg-12"
                id="resultIcon"
                onClick={() => this.handleIconClick("result")}
              >
                <span className="fa-stack fa-5x">
                  <i
                    id="resultCircle"
                    className="fas fa-circle fa-stack-2x flow-circle"
                  ></i>
                  <i className="fas fa-check fa-stack-1x fa-inverse"></i>
                </span>
              </div>
              <h2 className="text-center flow-stage-text col-xs-6 col-lg-12">
                Result
              </h2>
            </div>
          </div>
        </div>
        <div className="row">
          {this.state.curStage && (
            <CitizenInfoPanel id="citizenInfoPanel" stage={this.state.curStage} questions={this.state.locationQuestions[this.state.curStage] }/>
          )}
        </div>
      </div>
    );
  }
}
export default Citizens;
