function isPreParsePhase(phase) {
  return phase.phaseType === "pre-parse";
}
function isInlinePhase(phase) {
  return phase.phaseType === "inline";
}
function isPostParsePhase(phase) {
  return phase.phaseType === "post-parse";
}

export { isInlinePhase, isPostParsePhase, isPreParsePhase };
