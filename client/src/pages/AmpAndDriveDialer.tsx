import AmpDesigner from "@/pages/AmpDesigner";
import AmpDialIn from "@/pages/AmpDialIn";

export default function AmpAndDriveDialer() {
  return (
    <div className="pt-20 px-4 max-w-7xl mx-auto space-y-8">
      <AmpDialIn />
      <AmpDesigner />
    </div>
  );
}
