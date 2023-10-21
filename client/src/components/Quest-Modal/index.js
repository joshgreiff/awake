import React, { useState } from "react";
import { useMutation } from '@apollo/client'

import { ADD_QUEST } from '../../utils/mutations'

import './Modal.css'


export default function Modal({ closeModal }){
    const [questTitle, setQuestTitle] = useState('')
    const [questDescription, setQuestDescription] = useState('')

    const [addQuest, { data, loading, error }] = useMutation(ADD_QUEST)

    const handleSubmit = async event => {
        event.preventDefault()
        
        try {
            await addQuest({
                variables: { questTitle, questDescription }
            })

            setQuestTitle('')
            setQuestDescription('')
            window.location.reload()
        } catch(e) {
            console.error(e)
        }
    }

    const handleChangeTitle = event => {
        if(event.target.value.length){
            setQuestTitle(event.target.value)
        }
    }

    const handleChangeDescription = event => {
        if(event.target.value.length){
            setQuestDescription(event.target.value)
        }
    }


    return(
        <div className="modalBackground z-10 text-white" >
            <div className="modalContainer">
                <div className="titleCloseBtn">
                    <button onClick={() => closeModal(false)}>X</button>
                </div>
                <div className="title text-xl font">
                    <h2 className="font">Create an Attribute</h2>
                </div>
                
                <div className="body">
                    
                    <form className='flex flex-col' onSubmit={handleSubmit}>
                        <input className='mb-5 flex "block p-2.5  text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
                        placeholder="Attribute Title"
                        onChange={handleChangeTitle}

                        // value={questTitle}
                        ></input>
                        <textarea
                            placeholder="Attribute Description"
                            // value={questDescription}
                            className='flex "block p-2.5  text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
                            onChange={handleChangeDescription}
                        ></textarea>
                        <div className="footer">
                        <button className='cancelBtn' type='submit'>
                            Submit
                        </button>
                    <button className="font" id="cancelBtn" onClick={() => closeModal(false)}>Cancel</button>
                </div>
                    </form>
                </div>
                
            </div>
        </div>
    )
}