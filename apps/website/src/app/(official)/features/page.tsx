import WithPosterLayout from "@/components/WithPosterLayout";

function FeaturesPage() {
  return (
    <WithPosterLayout className="py-0">
      <h1 className="text-3xl font-bold pb-4">Features</h1>
      <section className="my-4">
        <ul className="list-disc *:mb-4">
          <li>🎨 Material Design Theme (MUI).</li>
          <li>🚀 Supports 128 threads in a single task</li>
          <li>📦 Lightweight, small package size</li>
          <li>🚥 Supports speed limit</li>
        </ul>
      </section>
    </WithPosterLayout>
  );
}

export default FeaturesPage;
