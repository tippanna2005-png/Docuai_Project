import { useState } from "react";
import { createWorker } from "tesseract.js";
import "./index.css";

const emptyInsights = () => ({
  documentType: "Not detected",
  name: "Not detected",
  fatherName: "Not detected",
  dateOfBirth: "Not detected",
  documentNumber: "Not detected",
  gender: "Not detected",
  address: "Not detected",
  summary: "No summary available.",
});

function App() {
  // =========================================================
  // MULTIPLE DOCUMENT STORAGE
  // =========================================================

  const [documents, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [showAssistant, setShowAssistant] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  // =========================================================
  // CURRENT DOCUMENT
  // =========================================================

  const selectedDocument = documents.find(
    (doc) => doc.id === selectedId
  );

  // =========================================================
  // CLEAN OCR VALUE
  // =========================================================

  const cleanOCRValue = (value) => {
    return value
      .replace(/[|]/g, " ")
      .replace(/[“”"]/g, "")
      .replace(/^[^A-Za-z0-9]+/, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // =========================================================
  // DOCUMENT INSIGHTS
  // =========================================================

  const extractDocumentInsights = (text) => {
    const rawText = text || "";

    const normalizedText = rawText
      .replace(/\r/g, "")
      .replace(/\t/g, " ");

    const lines = normalizedText
      .split("\n")
      .map((line) => cleanOCRValue(line))
      .filter(Boolean);

    const fullText = lines.join(" ");

    // DOCUMENT TYPE
    let documentType = "Personal Document";

    if (
      /election commission/i.test(fullText) ||
      /elector photo identity/i.test(fullText) ||
      /\bvoter\b/i.test(fullText) ||
      /\bEPIC\b/i.test(fullText)
    ) {
      documentType = "Voter ID / EPIC";
    } else if (
      /aadhaar/i.test(fullText) ||
      /uidai/i.test(fullText)
    ) {
      documentType = "Aadhaar Card";
    } else if (/passport/i.test(fullText)) {
      documentType = "Passport";
    } else if (
      /driving licence/i.test(fullText) ||
      /driving license/i.test(fullText)
    ) {
      documentType = "Driving Licence";
    } else if (
      /pan card/i.test(fullText) ||
      /income tax department/i.test(fullText)
    ) {
      documentType = "PAN Card";
    } else if (/certificate/i.test(fullText)) {
      documentType = "Certificate";
    }

    // NAME
    let name = "Not detected";

    for (const line of lines) {
      if (/father/i.test(line)) continue;

      const match = line.match(
        /\bName\s*[:\-]?\s*(.+?)(?=\s+(?:Father|Father's|Gender|Date|DOB|Age|Sex)\b|$)/i
      );

      if (match) {
        const value = cleanOCRValue(match[1]);

        if (
          value &&
          value.length >= 3 &&
          !/election commission/i.test(value)
        ) {
          name = value;
          break;
        }
      }
    }

    if (name === "Not detected") {
      const match = fullText.match(
        /\bName\s*[:\-]?\s*([A-Za-z]+(?:\s+[A-Za-z]+){1,4})/i
      );

      if (match) {
        name = cleanOCRValue(match[1]);
      }
    }

    // FATHER NAME
    let fatherName = "Not detected";

    for (const line of lines) {
      const match = line.match(
        /Father(?:'s|s)?\s*Name\s*[:\-]?\s*(.+?)(?=\s+(?:Gender|Date|DOB|Age|Sex|Name)\b|$)/i
      );

      if (match) {
        const value = cleanOCRValue(match[1]);

        if (value && value.length >= 3) {
          fatherName = value;
          break;
        }
      }
    }

    if (fatherName === "Not detected") {
      const match = fullText.match(
        /Father(?:'s|s)?\s*Name\s*[:\-]?\s*([A-Za-z]+(?:\s+[A-Za-z]+){1,5})/i
      );

      if (match) {
        fatherName = cleanOCRValue(match[1]);
      }
    }

    // DATE OF BIRTH
    let dateOfBirth = "Not detected";

    const dobMatch = fullText.match(
      /(?:Date\s*of\s*Birth|DOB)\s*[:\-\/]?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i
    );

    if (dobMatch) {
      dateOfBirth = dobMatch[1];
    }

    if (dateOfBirth === "Not detected") {
      const dates = fullText.match(
        /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{4}\b/g
      );

      if (dates && dates.length > 0) {
        dateOfBirth = dates[0];
      }
    }

    // DOCUMENT NUMBER
    let documentNumber = "Not detected";

    const voterNumber = fullText.match(
      /\b[A-Z]{2,4}\d{6,12}\b/i
    );

    if (voterNumber) {
      documentNumber = voterNumber[0].toUpperCase();
    }

    // AADHAAR NUMBER
    if (documentNumber === "Not detected") {
      const aadhaar = fullText.match(
        /\b\d{4}\s?\d{4}\s?\d{4}\b/
      );

      if (aadhaar) {
        documentNumber = aadhaar[0];
      }
    }

    // PAN NUMBER
    if (documentNumber === "Not detected") {
      const pan = fullText.match(
        /\b[A-Z]{5}\d{4}[A-Z]\b/i
      );

      if (pan) {
        documentNumber = pan[0].toUpperCase();
      }
    }

    // GENDER
    let gender = "Not detected";

    if (/\bFemale\b/i.test(fullText)) {
      gender = "Female";
    } else if (/\bMale\b/i.test(fullText)) {
      gender = "Male";
    }

    // ADDRESS
    let address = "Not detected";

    for (const line of lines) {
      const match = line.match(
        /\bAddress\s*[:\-]?\s*(.+)$/i
      );

      if (match) {
        const value = cleanOCRValue(match[1]);

        if (value.length >= 8) {
          address = value;
          break;
        }
      }
    }

    // SUMMARY
    let summary =
      `A ${documentType} was detected from the uploaded document.`;

    if (documentType === "Voter ID / EPIC") {
      summary =
        "Government-issued Elector Photo Identity Card used as an identification and electoral document.";
    } else if (documentType === "Aadhaar Card") {
      summary =
        "Government-issued identity document containing personal identification information.";
    } else if (documentType === "Passport") {
      summary =
        "Government-issued travel and identity document containing personal and travel information.";
    } else if (documentType === "Driving Licence") {
      summary =
        "Government-issued driving and identification document containing personal information.";
    } else if (documentType === "PAN Card") {
      summary =
        "Government-issued tax identification document containing personal identification information.";
    } else if (documentType === "Certificate") {
      summary =
        "Certificate containing important personal or official information.";
    }

    return {
      documentType,
      name,
      fatherName,
      dateOfBirth,
      documentNumber,
      gender,
      address,
      summary,
    };
  };

  // =========================================================
  // UPLOAD MULTIPLE DOCUMENTS
  // =========================================================

  const uploadFile = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length === 0) return;

    const newDocuments = selectedFiles.map((file) => ({
      id:
        Date.now() +
        Math.random().toString(36).substring(2, 9),

      file,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : "",

      analyzed: false,
      isAnalyzing: false,
      ocrProgress: 0,

      extractedText: "",
      insights: emptyInsights(),
    }));

    setDocuments((previous) => [
      ...previous,
      ...newDocuments,
    ]);

    // Automatically select the first newly uploaded document
    setSelectedId(newDocuments[0].id);

    e.target.value = "";

    setTimeout(() => {
      document
        .getElementById("documents")
        ?.scrollIntoView({
          behavior: "smooth",
        });
    }, 200);
  };

  // =========================================================
  // REMOVE DOCUMENT
  // =========================================================

  const removeDocument = (id) => {
    const documentToRemove = documents.find(
      (doc) => doc.id === id
    );

    if (documentToRemove?.preview) {
      URL.revokeObjectURL(documentToRemove.preview);
    }

    const remaining = documents.filter(
      (doc) => doc.id !== id
    );

    setDocuments(remaining);

    if (selectedId === id) {
      setSelectedId(
        remaining.length > 0
          ? remaining[remaining.length - 1].id
          : null
      );
    }

    setAnswer("");
    setQuestion("");
  };

  // =========================================================
  // ANALYZE ONE DOCUMENT
  // =========================================================

  const analyzeDocument = async (id) => {
    const currentDocument = documents.find(
      (doc) => doc.id === id
    );

    if (!currentDocument) return;

    setSelectedId(id);

    if (!currentDocument.file.type.startsWith("image/")) {
      setDocuments((previous) =>
        previous.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                analyzed: true,
                isAnalyzing: false,
                extractedText:
                  "PDF OCR is not enabled in this frontend-only version. Please upload an image for OCR analysis.",
              }
            : doc
        )
      );

      return;
    }

    try {
      setDocuments((previous) =>
        previous.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                isAnalyzing: true,
                analyzed: false,
                ocrProgress: 10,
              }
            : doc
        )
      );

      const worker = await createWorker("eng");

      setDocuments((previous) =>
        previous.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                ocrProgress: 30,
              }
            : doc
        )
      );

      const result = await worker.recognize(
        currentDocument.file
      );

      await worker.terminate();

      const text =
        result?.data?.text?.trim() || "";

      const finalText =
        text ||
        "No readable text was detected. Please upload a clearer document image.";

      const detectedInsights =
        extractDocumentInsights(finalText);

      setDocuments((previous) =>
        previous.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                extractedText: finalText,
                insights: detectedInsights,
                ocrProgress: 100,
                analyzed: true,
                isAnalyzing: false,
              }
            : doc
        )
      );
    } catch (error) {
      console.error("OCR Error:", error);

      setDocuments((previous) =>
        previous.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                extractedText:
                  "Sorry, I could not read this document. Please try a clearer image.",
                insights: emptyInsights(),
                analyzed: true,
                isAnalyzing: false,
                ocrProgress: 0,
              }
            : doc
        )
      );
    }
  };

  // =========================================================
  // AI ASSISTANT
  // =========================================================

  const askAI = () => {
    if (!question.trim()) return;

    if (!selectedDocument) {
      setAnswer(
        "Please select a document first."
      );
      return;
    }

    if (!selectedDocument.extractedText) {
      setAnswer(
        "Please analyze the selected document first."
      );
      return;
    }

    const q = question.toLowerCase();
    const insights = selectedDocument.insights;

    if (
      q.includes("summary") ||
      q.includes("summarize")
    ) {
      setAnswer(
        `Document Summary\n\n${insights.summary}\n\nDocument Type: ${insights.documentType}\nName: ${insights.name}`
      );
    } else if (q.includes("father")) {
      setAnswer(
        `Father's Name:\n\n${insights.fatherName}`
      );
    } else if (
      q.includes("name") &&
      !q.includes("father")
    ) {
      setAnswer(
        `Name:\n\n${insights.name}`
      );
    } else if (
      q.includes("birth") ||
      q.includes("dob")
    ) {
      setAnswer(
        `Date of Birth:\n\n${insights.dateOfBirth}`
      );
    } else if (
      q.includes("gender") ||
      q.includes("sex")
    ) {
      setAnswer(
        `Gender:\n\n${insights.gender}`
      );
    } else if (
      q.includes("number") ||
      q.includes("id number")
    ) {
      setAnswer(
        `Document Number:\n\n${insights.documentNumber}`
      );
    } else if (q.includes("address")) {
      setAnswer(
        `Address:\n\n${insights.address}`
      );
    } else if (
      q.includes("type") ||
      q.includes("what document")
    ) {
      setAnswer(
        `Document Type:\n\n${insights.documentType}`
      );
    } else {
      setAnswer(
        `Here are the main details I found:\n\nDocument: ${insights.documentType}\nName: ${insights.name}\nFather's Name: ${insights.fatherName}\nDate of Birth: ${insights.dateOfBirth}\nDocument Number: ${insights.documentNumber}\nGender: ${insights.gender}\nAddress: ${insights.address}`
      );
    }
  };

  // =========================================================
  // SCROLL
  // =========================================================

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="app">

      <div className="background-glow glow-one"></div>
      <div className="background-glow glow-two"></div>
      <div className="background-glow glow-three"></div>

      <div className="sparkles">
        ✦　✧　·　✦　·　✧　　✦
        <br />
        ·　✦　　✧　·　✦　　·
        <br />
        ✧　·　✦　　·　✧　✦
      </div>

      {/* NAVBAR */}

      <nav className="navbar">

        <div className="brand">
          <div className="brand-icon">✦</div>

          <div>
            <h2>
              Docu<span>AI</span>
            </h2>

            <small>
              PERSONAL DOCUMENT HUB
            </small>
          </div>
        </div>

        <div className="nav-menu">

          <button
            onClick={() => scrollTo("dashboard")}
          >
            Dashboard
          </button>

          <button
            onClick={() => scrollTo("documents")}
          >
            Documents
          </button>

          <button
            onClick={() => setShowAssistant(true)}
          >
            AI Assistant
          </button>

        </div>

        <div className="profile">
          <div className="avatar">S</div>

          <span>
            My Workspace
          </span>
        </div>

      </nav>

      <main>

        {/* HERO */}

        <section
          className="hero"
          id="dashboard"
        >

          <div className="hero-text">

            <div className="badge">
              ✦ AI-POWERED DOCUMENT INTELLIGENCE
            </div>

            <h1>
              Your documents.
              <br />
              <span>
                Understood instantly.
              </span>
            </h1>

            <p>
              Upload, organize and understand your
              important documents with the power of AI
              — all in one intelligent workspace.
            </p>

            <div className="hero-buttons">

              <label className="primary-button">

                📁 Upload Documents

                <input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={uploadFile}
                  hidden
                />

              </label>

              <button
                className="secondary-button"
                onClick={() =>
                  setShowAssistant(true)
                }
              >
                ✦ Ask DocuAI
              </button>

            </div>

            <div className="trust-row">
              <span>✓ Smart organization</span>
              <span>✓ AI powered</span>
              <span>✓ Easy to understand</span>
            </div>

          </div>

          <div className="ai-visual">

            <div className="orbit orbit-a"></div>
            <div className="orbit orbit-b"></div>
            <div className="orbit orbit-c"></div>

            <div className="ai-orb">
              ✦
            </div>

            <div className="floating-card top-card">

              <div className="mini-icon">
                ✓
              </div>

              <div>
                <b>
                  Documents Ready
                </b>

                <small>
                  AI can understand them
                </small>
              </div>

            </div>

            <div className="floating-card bottom-card">

              <div className="mini-icon">
                ✦
              </div>

              <div>
                <b>
                  AI Analysis
                </b>

                <small>
                  Instant document insights
                </small>
              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            DOCUMENT LIBRARY
        ================================================= */}

        <section
          className="document-section"
          id="documents"
        >

          <div className="document-heading">

            <div>

              <span className="uploaded-label">
                ✓ DOCUMENT LIBRARY
              </span>

              <h2>
                My Documents
              </h2>

              <p>
                {documents.length === 0
                  ? "No documents uploaded yet."
                  : `${documents.length} document${documents.length > 1 ? "s" : ""} uploaded`}
              </p>

            </div>

            <label className="primary-button">

              📁 Add Documents

              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={uploadFile}
                hidden
              />

            </label>

          </div>

          {/* ALL DOCUMENTS */}

          {documents.length === 0 ? (

            <div className="glass-card">
              <h2>
                📁 No documents yet
              </h2>

              <p>
                Upload your first document to
                start using DocuAI.
              </p>
            </div>

          ) : (

            <div className="feature-grid">

              {documents.map((doc, index) => (

                <div
                  className="feature-card"
                  key={doc.id}
                  style={{
                    cursor: "pointer",
                    border:
                      selectedId === doc.id
                        ? "2px solid rgba(150,100,255,.7)"
                        : undefined,
                  }}
                  onClick={() => {
                    setSelectedId(doc.id);
                    setAnswer("");
                  }}
                >

                  <div className="feature-icon purple">
                    📄
                  </div>

                  <h3>
                    {doc.file.name}
                  </h3>

                  <p>
                    {Math.round(
                      doc.file.size / 1024
                    )} KB
                  </p>

                  <p>

                    {doc.analyzed
                      ? "✓ AI Analysis Complete"
                      : "○ Not analyzed"}

                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginTop: "12px",
                    }}
                  >

                    <button
                      className="analyze-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        analyzeDocument(doc.id);
                      }}
                    >
                      {doc.isAnalyzing
                        ? "Reading..."
                        : doc.analyzed
                        ? "Analyze Again"
                        : "✦ Analyze with AI"}
                    </button>

                    <button
                      className="remove-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDocument(doc.id);
                      }}
                    >
                      ✕ Remove
                    </button>

                  </div>

                </div>

              ))}

            </div>

          )}

          {/* SELECTED DOCUMENT */}

          {selectedDocument && (

            <div
              className="document-grid"
              style={{ marginTop: "30px" }}
            >

              {/* PREVIEW */}

              <div className="glass-card">

                <h3>
                  📄 Document Preview
                </h3>

                <div className="preview">

                  {selectedDocument.preview ? (

                    <img
                      src={selectedDocument.preview}
                      alt="Uploaded document"
                    />

                  ) : (

                    <div className="pdf-preview">

                      <div className="pdf-icon">
                        PDF
                      </div>

                      <h3>
                        PDF Document
                      </h3>

                      <p>
                        {selectedDocument.file.name}
                      </p>

                    </div>

                  )}

                </div>

              </div>

              {/* ANALYSIS */}

              <div className="glass-card analysis">

                <div className="analysis-icon">
                  ✦
                </div>

                <small>
                  DOCUAI INTELLIGENCE
                </small>

                {!selectedDocument.analyzed &&
                  !selectedDocument.isAnalyzing && (

                    <>
                      <h2>
                        Ready to understand
                        your document.
                      </h2>

                      <p>
                        Let DocuAI extract important
                        information and generate a
                        useful summary.
                      </p>

                      <button
                        className="analyze-button"
                        onClick={() =>
                          analyzeDocument(
                            selectedDocument.id
                          )
                        }
                      >
                        ✦ Analyze with AI
                      </button>
                    </>

                  )}

                {/* LOADING */}

                {selectedDocument.isAnalyzing && (

                  <div className="ocr-loading">

                    <div className="analysis-loader">
                      ✦
                    </div>

                    <h2>
                      Reading your document...
                    </h2>

                    <p>
                      DocuAI is extracting information
                      from your document.
                    </p>

                    <div className="progress-container">

                      <div
                        className="progress-bar"
                        style={{
                          width: `${selectedDocument.ocrProgress}%`,
                        }}
                      ></div>

                    </div>

                    <small>
                      OCR analysis in progress...
                    </small>

                  </div>

                )}

                {/* RESULTS */}

                {selectedDocument.analyzed &&
                  !selectedDocument.isAnalyzing && (

                    <>

                      <h2>
                        ✨ Analysis Complete
                      </h2>

                      <div className="result-box">

                        <p>
                          <b>📄 File:</b>{" "}
                          {selectedDocument.file.name}
                        </p>

                        <p>
                          <b>📦 Type:</b>{" "}
                          {selectedDocument.file.type ||
                            "Document"}
                        </p>

                      </div>

                      <div className="document-insights">

                        <div className="insights-header">

                          <span className="insights-icon">
                            🧠
                          </span>

                          <div>

                            <small>
                              DOCUAI INTELLIGENCE
                            </small>

                            <h3>
                              DOCUMENT INSIGHTS
                            </h3>

                          </div>

                        </div>

                        <div className="insight-grid">

                          <div className="insight-item">

                            <span>📄</span>

                            <div>
                              <small>
                                Document Type
                              </small>

                              <strong>
                                {selectedDocument.insights.documentType}
                              </strong>
                            </div>

                          </div>

                          <div className="insight-item">

                            <span>👤</span>

                            <div>
                              <small>
                                Name
                              </small>

                              <strong>
                                {selectedDocument.insights.name}
                              </strong>
                            </div>

                          </div>

                          <div className="insight-item">

                            <span>👨</span>

                            <div>
                              <small>
                                Father's Name
                              </small>

                              <strong>
                                {selectedDocument.insights.fatherName}
                              </strong>
                            </div>

                          </div>

                          <div className="insight-item">

                            <span>🎂</span>

                            <div>
                              <small>
                                Date of Birth
                              </small>

                              <strong>
                                {selectedDocument.insights.dateOfBirth}
                              </strong>
                            </div>

                          </div>

                          <div className="insight-item">

                            <span>🔢</span>

                            <div>
                              <small>
                                Document Number
                              </small>

                              <strong>
                                {selectedDocument.insights.documentNumber}
                              </strong>
                            </div>

                          </div>

                          <div className="insight-item">

                            <span>⚧</span>

                            <div>
                              <small>
                                Gender
                              </small>

                              <strong>
                                {selectedDocument.insights.gender}
                              </strong>
                            </div>

                          </div>

                          <div className="insight-item full-width">

                            <span>📍</span>

                            <div>
                              <small>
                                Address
                              </small>

                              <strong>
                                {selectedDocument.insights.address}
                              </strong>
                            </div>

                          </div>

                        </div>

                        {/* SUMMARY */}

                        <div className="summary-box">

                          <div className="summary-title">
                            📋 Summary
                          </div>

                          <p>
                            {selectedDocument.insights.summary}
                          </p>

                        </div>

                        {/* OCR */}

                        <details className="raw-ocr">

                          <summary>
                            🔍 View Raw OCR Text
                          </summary>

                          <div>
                            {selectedDocument.extractedText}
                          </div>

                        </details>

                      </div>

                    </>

                  )}

              </div>

            </div>

          )}

        </section>

        {/* FEATURES */}

        <section
          className="features"
          id="features"
        >

          <div className="section-title">

            <span>
              POWERFUL FEATURES
            </span>

            <h2>
              Everything your documents need.
            </h2>

          </div>

          <div className="feature-grid">

            <button
              className="feature-card"
              onClick={() => {
                if (selectedDocument) {
                  scrollTo("documents");
                } else {
                  setShowAssistant(true);
                }
              }}
            >

              <div className="feature-icon purple">
                ✦
              </div>

              <h3>
                AI Understanding
              </h3>

              <p>
                Extract key information and understand
                documents instantly.
              </p>

              <span className="feature-action">
                Explore AI →
              </span>

            </button>

            <button
              className="feature-card"
              onClick={() =>
                scrollTo("documents")
              }
            >

              <div className="feature-icon blue">
                ◈
              </div>

              <h3>
                Smart Organization
              </h3>

              <p>
                Keep all your uploaded documents
                together in one workspace.
              </p>

              <span className="feature-action">
                View Documents →
              </span>

            </button>

            <button
              className="feature-card"
              onClick={() => {
                setQuestion(
                  "What is the expiry date of my document?"
                );
                setShowAssistant(true);
              }}
            >

              <div className="feature-icon pink">
                ◷
              </div>

              <h3>
                Important Dates
              </h3>

              <p>
                Find important dates from your
                uploaded documents.
              </p>

              <span className="feature-action">
                Check dates →
              </span>

            </button>

            <button
              className="feature-card"
              onClick={() =>
                scrollTo("documents")
              }
            >

              <div className="feature-icon green">
                ✓
              </div>

              <h3>
                Easy Management
              </h3>

              <p>
                Manage multiple personal documents
                from one simple workspace.
              </p>

              <span className="feature-action">
                Manage documents →
              </span>

            </button>

          </div>

        </section>

        {/* AI BANNER */}

        <section className="ai-banner">

          <div className="banner-icon">
            ✦
          </div>

          <div>

            <small>
              YOUR PERSONAL DOCUMENT COPILOT
            </small>

            <h2>
              Ask anything about your documents.
            </h2>

            <p>
              "Give me a summary of my document"
            </p>

          </div>

          <button
            onClick={() =>
              setShowAssistant(true)
            }
          >
            Open AI Assistant →
          </button>

        </section>

      </main>

      {/* AI ASSISTANT */}

      {showAssistant && (

        <div
          className="modal-background"
          onClick={() =>
            setShowAssistant(false)
          }
        >

          <div
            className="assistant"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="assistant-header">

              <div>

                <small>
                  ✦ DOCUAI
                </small>

                <h2>
                  AI Assistant
                </h2>

              </div>

              <button
                onClick={() =>
                  setShowAssistant(false)
                }
              >
                ✕
              </button>

            </div>

            <div className="assistant-message">

              👋 Hi! I'm DocuAI. Ask me something
              about your selected document.

            </div>

            {selectedDocument && (

              <div className="assistant-message">

                📄 Selected:
                <br />
                <b>
                  {selectedDocument.file.name}
                </b>

              </div>

            )}

            {answer && (

              <div className="assistant-answer">

                ✦ {answer}

              </div>

            )}

            <div className="question-box">

              <input
                value={question}
                onChange={(e) =>
                  setQuestion(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    askAI();
                  }
                }}
                placeholder="Ask about your document..."
              />

              <button
                onClick={askAI}
              >
                Send
              </button>

            </div>

            <div className="quick-questions">

              <button
                onClick={() =>
                  setQuestion(
                    "Give me a summary"
                  )
                }
              >
                📋 Summary
              </button>

              <button
                onClick={() =>
                  setQuestion(
                    "What is the date of birth?"
                  )
                }
              >
                🎂 Date of birth
              </button>

              <button
                onClick={() =>
                  setQuestion(
                    "Tell me about my document"
                  )
                }
              >
                📄 Document details
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;