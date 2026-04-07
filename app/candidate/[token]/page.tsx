import { CandidateSessionView } from "./session-view";

export default function CandidatePage({ params }: { params: { token: string } }) {
  return <CandidateSessionView token={params.token} />;
}
