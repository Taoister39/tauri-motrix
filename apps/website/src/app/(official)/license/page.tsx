async function LicensePage() {
  const motrixData = await fetch(
    "https://raw.githubusercontent.com/Taoister39/tauri-motrix/refs/heads/main/LICENSE",
  ).then((res) => res.text());

  return (
    <article>
      <h1 className="text-3xl font-bold">License</h1>

      <section>
        <h2 className="text-2xl font-bold my-[1em]">Tauri Motrix</h2>
        <pre className="break-words whitespace-pre-wrap">{motrixData}</pre>
      </section>
    </article>
  );
}

export default LicensePage;
