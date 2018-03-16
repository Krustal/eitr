import babel from 'rollup-plugin-babel';

function plugins() {
  return [
    babel({
      exclude: 'node_modules/**',
    }),
  ];
}

console.log(process.env.BABEL_ENV, process.env.NODE_ENV);

export default [
  {
    input: 'src/builder.js',
    output: { format: 'cjs', file: 'lib/index.js' },
    plugins: plugins(),
    external: ['ramda'],
  },
  {
    input: 'src/builder.js',
    output: { format: 'es', file: 'es/index.js' },
    plugins: plugins(),
    external: ['ramda'],
  },
];
