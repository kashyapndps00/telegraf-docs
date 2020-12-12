/* eslint-disable @typescript-eslint/no-floating-promises */
import {
  BaseScene as Scene,
  SceneContext,
  SceneContextScene,
  SceneSessionData,
  session,
  Stage,
  Telegraf,
} from 'telegraf'

/**
 * It is possible to extend the session object that is available to each scene.
 * This can be done by extending `SceneSessionData`.
 */
interface MySceneSession extends SceneSessionData {
  // will be available under `ctx.scene.session.mySceneSessionProp`
  mySceneSessionProp: number
}

/**
 * Since you can only pass a custom context to the bot, we can simply define a
 * type alias to use the custom scene without actually extending the context in
 * any way.
 *
 * As we did not define a custom session object, we can simply pass the scene
 * session object as a second type variable to `SceneContext`. Note that we have
 * to use a default value as a first argument.
 *
 * IMPORTANT: Whenever we want to extend the scene session, we have to supply
 * the type arguments to `SceneContext`. It is not possible to access any
 * properties of `ctx.scene.session` if we only `extend SceneContext`. If we did
 * that, only `ctx.session` would be available.
 */
type MyContext = SceneContext<SceneContextScene<MyContext>, MySceneSession>

// Handler factories
const { enter, leave } = Stage

// Greeter scene
const greeterScene = new Scene<MyContext>('greeter')
greeterScene.enter((ctx) => ctx.reply('Hi'))
greeterScene.leave((ctx) => ctx.reply('Bye'))
greeterScene.hears('hi', enter('greeter'))
greeterScene.on('message', (ctx) => ctx.replyWithMarkdown('Send `hi`'))

// Echo scene
const echoScene = new Scene<MyContext>('echo')
echoScene.enter((ctx) => ctx.reply('echo scene'))
echoScene.leave((ctx) => ctx.reply('exiting echo scene'))
echoScene.command('back', leave())
echoScene.on('text', (ctx) => ctx.reply(ctx.message.text))
echoScene.on('message', (ctx) => ctx.reply('Only text messages please'))

const bot = new Telegraf<MyContext>(process.env.BOT_TOKEN)

const stage = new Stage<MyContext>([greeterScene, echoScene], {
  ttl: 10,
})
bot.use(session())
bot.use(stage.middleware())
bot.use((ctx, next) => {
  // we now have access to the the fields defined above
  ctx.scene.session.mySceneSessionProp ??= 0
  return next()
})
bot.command('greeter', (ctx) => ctx.scene.enter('greeter'))
bot.command('echo', (ctx) => ctx.scene.enter('echo'))
bot.on('message', (ctx) => ctx.reply('Try /echo or /greeter'))
bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
