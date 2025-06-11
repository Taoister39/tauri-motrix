export default {
  "*.{ts,tsx,js,jsx,css,md}": (filenames) => [
    `eslint --fix '${filenames.join("' '")}'`,
    `prettier --write '${filenames.join("' '")}'`,
  ],
  "*.rs": (filenames) =>
    `rustfmt --edition 2021 --check '${filenames.join("' '")}'`,
};
