import { Component } from "react";

// Without this, a render error anywhere (like the FullCalendar version-skew
// bug this caught) unmounts the entire React tree — sidebar and all — down
// to a blank white page, with nothing in the UI hinting why. This catches
// it at the page level instead, so at least the shell survives.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-text" style={{ textAlign: "left" }}>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Something went wrong rendering this page.</p>
          <p style={{ fontFamily: "var(--mono)", fontSize: "0.8rem", whiteSpace: "pre-wrap" }}>
            {String(this.state.error.message || this.state.error)}
          </p>
          <button type="button" className="btn btn--secondary" style={{ marginTop: 14 }} onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
