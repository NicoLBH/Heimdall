export function createProjectSituationsReviewState() {
  function getReviewState() {
    return {
      isReady: false,
      reviewedSituationIds: new Set(),
      dismissedSituationIds: new Set()
    };
  }

  return {
    getReviewState
  };
}
