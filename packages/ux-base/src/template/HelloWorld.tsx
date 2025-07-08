import stylex from "@stylexjs/stylex";

const styles = stylex.create({
  content: {
    display: "flex",
    lineHeight: 1.1,
    textAlign: "center",
    flexDirection: "column",
    justifyContent: "center",
  },
  title: {
    fontSize: "3.6rem",
    fontWeight: 700,
  },
  description: {
    fontSize: "1.2rem",
    fontWeight: 400,
    opacity: 0.5,
  },
});

function HelloWorld() {
  return (
    <div {...stylex.props(styles.content)}>
      <h1 {...stylex.props(styles.title)}>Rsbuild with React</h1>
      <p {...stylex.props(styles.description)}>
        Start building amazing things with Rsbuild.
      </p>
    </div>
  );
}

export default HelloWorld;
