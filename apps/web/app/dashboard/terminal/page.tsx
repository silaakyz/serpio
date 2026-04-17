import { TerminalClient } from "@/components/dashboard/TerminalClient";

interface Props {
  searchParams: { jobId?: string };
}

export default function TerminalPage({ searchParams }: Props) {
  return (
    <div className="h-full flex flex-col space-y-3">
      <div>
        <h2 className="text-xl font-ui font-bold text-text">Terminal</h2>
        <p className="text-sm text-muted font-ui mt-1">
          İş kuyruğunu izleyin ve canlı logları takip edin.
        </p>
      </div>
      <div className="flex-1" style={{ minHeight: "520px" }}>
        <TerminalClient initialJobId={searchParams.jobId} />
      </div>
    </div>
  );
}
