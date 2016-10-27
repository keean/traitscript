module.exports = (() => {
"use strict"

const AST = require('../src/ast.js')
const MultiMap = require('../src/multimap.js')
const inst = require('../src/typing-instantiate.js')
const unify = require('../src/unification.js')
const Show = require('../src/typing-show.js')

function deepFreeze(obj) {
   Object.freeze(obj)
   for (const k of Object.keys(obj)) {
      const p = obj[k]
      if (typeof p == 'object' && p !== null) {
         deepFreeze(p)
      }
   }
   return obj
}

const IntegerType = deepFreeze(new AST.TypeConstructor('Int', []))
const UnitType = deepFreeze(new AST.TypeConstructor('Unit', []))

AST.LiteralInt.prototype.infer = function() {
   this.typing = new AST.Typing(IntegerType)
   return deepFreeze(this.typing)
}

AST.Variable.prototype.infer = function() {
   this.typing = new AST.Typing(new AST.TypeVariable('VAR'))
   this.typing.context.set(this.name, this.typing.type)
   return deepFreeze(this.typing)
}

AST.LiteralTuple.prototype.infer = function() {
   const context = new MultiMap()
   const type = new AST.TypeConstructor('Product', new Array(this.expressions.length))
   for (let i = 0; i < this.expressions.length; ++i) {
       const typing = this.expressions[i].infer()
       context.union(typing.context)
       type.params[i] = typing.type
   }
   this.typing = new AST.Typing(type, context)
   return deepFreeze(this.typing)
}

AST.LiteralArray.prototype.infer = function() {
   throw 'array literal not supported in source language'
}

AST.Application.prototype.infer = function() {
   const f = inst(this.fun.infer())
   const a = inst(this.arg.infer())
   f.context.union(a.context)
   const t = new AST.Typing(new AST.TypeVariable(), f.context)
   const u = new AST.TypeConstructor('Arrow', [a.type, t.type])
   if (unify.types(f.type, u)) {
      this.typing = t
   } else {
      const g = this.fun.typing.type
      const b = new AST.TypeConstructor('Arrow', [this.arg.typing.type, new AST.TypeVariable()])
      this.typing = new AST.Typing(new AST.TypeConstructor('!Fail!', [g, b]))
   }
   return deepFreeze(this.typing)
}

AST.Fn.prototype.infer = function() {
   const b = inst(this.body.infer())
   const ps = new AST.TypeConstructor('Product', [])
   for (const r of this.args) {
      const a = new AST.TypeVariable()
      const ts = b.context.get(r) || []
      for (const t of ts) {
         if (!unify.types(a, t)) {
            throw 'unification failed'
         }
      }
      b.context.erase(r)
      ps.params.push(a)
   }

   this.typing = new AST.Typing(new AST.TypeConstructor('Arrow', [ps, b.type]), b.context)
   return deepFreeze(this.typing)
}

AST.Declaration.prototype.infer = function() {
   this.typing = new AST.Typing(UnitType)
   this.typing.defined.set(this.name, this.expression.infer())
   return deepFreeze(this.typing)
}

AST.Assignment.prototype.infer = function() {
   throw 'assignment not implemented'
   /*this.expression.typing()
   this.typing = new AST.Typing(this.expression.context, UnitType)
   this.typing = new AST.Typing(new Map, UnitType)
   return deepFreeze(this.typing)
   return this.typing*/
}

AST.Return.prototype.infer = function() {
   this.typing = this.expression.infer()
   return deepFreeze(this.typing)
}

function resolveReferences(context, defined, outcxt) {
   for (const key of context.keys()) {  
      const poly = defined.get(key)
      if (poly !== undefined) {
         const mono = inst(poly)
         for (const c of context.get(key)) {
            if (!unify.types(mono.type, c)) {
               throw 'unification failed'
            }
         }
         resolveReferences(mono.context, defined, outcxt)
      } else {
         for (const c of context.get(key)) {
            outcxt.set(key, c)
         }
      }
   }
}

AST.Block.prototype.infer = function() {
   const context = new MultiMap()
   const defined = new Map()
   let type = UnitType
   for(let i = 0; i < this.statements.length; ++i) {
      const statement_typing = inst(this.statements[i].infer())
      resolveReferences(statement_typing.context, defined, context)
      for (const [k, v] of statement_typing.defined.entries()) {
         defined.set(k, v)
      }
      type = statement_typing.type
   }
   this.typing = new AST.Typing(type, context, defined)
   return deepFreeze(this.typing)
}

return (ast) => {
   return ast.infer()
}

})()
