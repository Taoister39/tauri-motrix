import LabCard from "@/components/LabCard";

function LabContent() {
  return (
    <div className="sm:px-9 px-5 sm:py-4 py-3">
      <h1 className="text-3xl font-bold mb-2">Featured Extensions</h1>
      <section className="flex gap-12 flex-wrap">
        <LabCard
          title="YAAW for Chrome"
          repository="https://github.com/acgotaku/YAAW-for-Chrome"
          cover="/yaaw-for-chrome.png"
          author="acgotaku"
          description="Chrome version of YAAW, support right click to add to Motrix to download"
        />
        <LabCard
          title="YAAW for Chrome"
          repository="https://github.com/acgotaku/YAAW-for-Chrome"
          cover="/yaaw-for-chrome.png"
          author="acgotaku"
          description="Chrome version of YAAW, support right click to add to Motrix to download"
        />
        <LabCard
          title="YAAW for Chrome"
          repository="https://github.com/acgotaku/YAAW-for-Chrome"
          cover="/yaaw-for-chrome.png"
          author="acgotaku"
          description="Chrome version of YAAW, support right click to add to Motrix to download"
        />
      </section>
    </div>
  );
}

export default LabContent;
