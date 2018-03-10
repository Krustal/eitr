import babel from 'rollup-plugin-babel';

function plugins() {
  return [
    babel({
      exclude: 'node_modules/**',
    }),
  ];
}

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
