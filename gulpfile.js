const del = require('del');
const paths = require('./paths');
const typescript = require('gulp-typescript');
const sourcemaps = require('gulp-sourcemaps');
const mocha = require('gulp-mocha');
const watch = require('gulp-watch');
const gulp = require('gulp');

function cleanMain() {
  return del(paths.outputMain);
}

function cleanTest() {
  return del(paths.outputTest);
}

function compileMain() {
  return compile(paths.source, paths.output);
}

function compileTest() {
  return compile(paths.test, paths.output);
}

function unitTest(cb) {
  gulp.src('build/test/**/*.unittest.js', {read: false})
    .pipe(mocha())
    .once('end', () => {
      cb();
    });
}

function watchTask() {
  return Promise.all([
    watch(`${paths.baseMain}/**/*.ts`, {ignoreInitial: true}, function (file) {
      console.log('compiling', file.history);
      compile(file.history, paths.outputMain, {base: `${paths.baseMain}/`});
      compileMain();
    }),
    watch([`${paths.baseTest}/**/*`], gulp.parallel('compile:test'))
  ]);
}

function compile(source, output, options) {
  options = options || {base: `${paths.root}/`};
  if (!source instanceof Array) {
    source = [source];
  }
  const sourceTsFiles = [`${paths.typings}/**/*.ts`].concat(source);
  const tsProject = typescript.createProject(paths.tsConfig);
  const tsResult = gulp.src(sourceTsFiles, options)
    .pipe(sourcemaps.init())
    .pipe(tsProject());
  tsResult.dts.pipe(gulp.dest(output));
  return tsResult.js
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(output));
}

process.on('unhandledRejection', (e) => {
  console.trace('Error: ', e);
});

gulp.task('clean:main', cleanMain);
gulp.task('clean:test', cleanTest);
gulp.task('compile:main', compileMain);
gulp.task('compile:test', compileTest);
gulp.task('build', gulp.parallel('compile:main', 'compile:test'));
gulp.task('test', gulp.series('build', unitTest));
gulp.task('watch', gulp.series('build', watchTask));