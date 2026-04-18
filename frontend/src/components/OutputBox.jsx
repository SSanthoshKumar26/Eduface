import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Spinner, Card } from "react-bootstrap";

export default function OutputBox({ output, loading }) {
  if (loading) {
    return (
      <div className="d-flex justify-content-center my-5">
        <Spinner animation="border" variant="info" role="status" />
        <span className="ms-3 align-self-center fs-5 text-info">Generating content...</span>
      </div>
    );
  }

  if (!output) {
    return (
      <Card className="p-3 my-4 text-center" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#ccc" }}>
        Ready to generate amazing content...
      </Card>
    );
  }

  return (
    <Card className="my-4 p-4" style={{ backgroundColor: "rgba(0,0,0,0.8)", color: "#fff" }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
    </Card>
  );
}
