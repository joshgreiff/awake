import React from 'react';

export default function CreateQuest() {
   return (
      <>
         <div className="bg-dark min-h-screen flex flex-col">
            <div className="container max-w-sm mx-auto flex-1 flex flex-col items-center justify-center px-2">
               <div className="bg-zinc-600 px-6 py-8 rounded shadow-md text-black w-full">
                  <h1 className="bg-zinc-600 mb-8 text-3xl text-center bg-white">Create a Quest</h1>
                  <form className="bg-grey">
                     <label className='font-bold text-white' htmlFor='quest-title'>Quest Title:</label>
                     <input className="block border border-grey-light w-full p-3 rounded mb-4" type='text' id='quest-title' name='quest-title' placeholder='Enter your title' />
                     <label className='font-bold text-white' htmlFor='quest-description'>Quest Description:</label>
                     <textarea className="block border border-grey-light w-full p-3 rounded mb-4" id='quest-description' name='quest-description' placeholder='Enter the description' />
                     <button
                        type="submit"
                        className="w-full py-3 rounded bg-green-400 text-black hover:bg-green-dark focus:outline-none my-1"
                     >
                        Create
                     </button>
                  </form>
               </div>
            </div>
         </div>
      </>
   )
}