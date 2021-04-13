import express from 'express'

const main = () => {
  const app = express()

  app.use(express.json())
  app.use(express.urlencoded({extended: true}))

  app.get("/", (_,res) => {
    res.send("hogehoge")
  })

  app.post("/update", (req,res) => {
    const data = req.body
    console.log(data)
    res.status(200)
  })

  app.listen(8888, () => {
    console.log('server working! port: 8888');
  })
}
main()