import React from "react";
import { Link } from 'react-router-dom';

// import DashDailies from "../DashDailies";
// import DashMilestone from "../DashMilestone";

const dashQuests = ({quests, title}) => {
    if(!quests.length) {
        return <h3 className="text-black text-xl lg:py-10">You don't have have any attributes yet.</h3>
    }

    return (
        <div className="overflow-y-auto dashboard">
            <h3 className="font py-4 lg:text-2xl">{title}</h3>
            {quests && quests.map(quest => (
                <div key={quest._id}>
                    <div className="quest-title-dash" >
                        <h3 className="font py-1">{quest.questTitle}</h3>
                    </div>
                    {/* <div className="quest-description-dash">
                        <p className="font">{quest.questDescription}</p>
                    </div> */}
                    <p className="text-black font py-1">Milestones: {quest.milestones.length}</p>
                    {/* <DashMilestone milestones={quest?.milestones || []} /> */}
                    <p className="font py-1">Daily Quests: {quest.dailies.length}</p>
                    {/* <DashDailies dailies={quest?.dailies || []} /> */}
                </div>
            ))}

        </div>
    )
}   

export default dashQuests;