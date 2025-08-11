/** Tailwind CSS v4: configuration is now defined primarily in CSS via @import, @theme and @plugin.
 *  Keeping an empty config avoids conflicts with v3-style options.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./components/**/*.{js,vue,ts}',
		'./layouts/**/*.vue',
		'./pages/**/*.vue',
		'./plugins/**/*.{js,ts}',
		'./nuxt.config.{js,ts}',
		'./app.vue',
	],
	theme: {
		extend: {
			colors: {
				discord: {
					50: '#f0f2ff',
					100: '#e6e9ff',
					200: '#d0d6ff',
					300: '#aab5ff',
					400: '#7c89ff',
					500: '#5865f2',
					600: '#4752c4',
					700: '#3c459e',
					800: '#313a7f',
					900: '#2c3467',
				},
			},
		},
	},
	plugins: [
		require('@tailwindcss/forms'),
	],
};
