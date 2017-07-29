var gulp = require("gulp");
var del = require('del');
var ts = require("gulp-typescript");
var tslint = require("gulp-tslint");
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');
var reload = browserSync.reload;

var tsProject = ts.createProject("tsconfig.json");
var tsSrc = ["src/**/*.ts", "src/**/*.tsx"];
var appSrc = ["app/**/*"];

gulp.task("build:ts", function() {
    return gulp.src(tsSrc)
        .pipe(tslint({
            configuration: "tsconfig.json",
            formatter: "verbose"
        }))
        .pipe(tslint.report({
            emitError: true
        }))
        .pipe(tsProject())
        .js
        .pipe(gulp.dest("build"))
        .on("error", function() {});

});

gulp.task('copy', ['copy:app', 'copy:ts'], function(cb) {
    return cb();
});

gulp.task('copy:ts', ['build:ts'], function() {
    return gulp.src([
        'build/**/*',
        '!**/.DS_Store'
    ], {
        dot: true
    }).pipe(gulp.dest('dist'));
});

gulp.task('copy:app', function() {
    return gulp.src([
        'app/**/*',
        '!**/.DS_Store',
        '!**/Thumbs.db'
    ], {
        dot: true
    }).pipe(gulp.dest('dist'));
});

gulp.task('clean', function() {
    return del(['build', 'dist']);
});

gulp.task('browsersync', function(cb) {
    browserSync({
        port: 5000,
        notify: false,
        logPrefix: 'BS',
        snippetOptions: {},
        // https: true,
        server: {
            baseDir: ['build', 'app']
        }
    });
    return cb();
});

gulp.task("serve", function(cb) {
    gulp.watch(tsSrc, ["build:ts", reload]);
    gulp.watch(appSrc, [reload]);
    return runSequence(['build:ts'], 'browsersync', cb);
});

gulp.task('dist', ['clean'], function(cb) {
    runSequence(['build:ts'], ['copy'], cb);
});

gulp.task('default', ['dist'], function(cb) {
    return cb();
});
