id1(x1) =>
   test() : [] -> [] => ()
   id(x2) : [A] -> [A, A] => (x2, x2)
   let id3 : [A] -> [A, A] = (x3) => id(
      x3)
   id4(x : Int) => x
   let y = id(id4(x1))
   return id3(((x4) => x4)(y))
id1(42)


id2(x1) =>

   test() : [] -> [] => ()

   id(x2) : [A] -> [A, A] => (x2, x2)

   let id3 : [A] -> [A, A] = (x3) => id(

      x3)

   id4(x : Int) => x

   let y = id(id4(x1))

   return id3(((x4) => x4)(y))

id2(42)

