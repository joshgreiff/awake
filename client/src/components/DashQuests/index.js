import React from "react";

import DashDailies from "../DashDailies";
import DashMilestone from "../DashMilestone";

const dashQuests = ({ quests, milestones, dailies, title }) => {

    const handleRedirect = (e) => {
        e.preventDefault();

        window.location.replace('/Create');
    }

    if (!quests.length) {
        return (
            <>
                <h3 className="text-black text-xl lg:py-10">You dont have have any quests yet.</h3>
                <button className="text-white font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-green-600 hover:bg-green-800" type="button" onClick={handleRedirect}>
                    Get Started!
                </button>
            </>
        )

    }

    return (
        <div>
            <br />
            <button className="text-white font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-green-600 hover:bg-green-800" type="button" onClick={handleRedirect}>
                New Quest
            </button>

            <div>
                <br />
                <h3>{title}</h3>
                {quests && quests.map(quest => (
                    <div key={quest._id}>
                        <div className="quest-title-dash" >
                            <h3>{quest.questTitle}</h3>
                        </div>
                        <div className="quest-description-dash">
                            <p>{quest.questDescription}</p>
                        </div>
                        <p className="text-black">Milestones:</p>
                        <DashMilestone milestones={milestones} />
                        <p>Daily Quests:</p>
                        <DashDailies dailies={dailies} />
                    </div>
                ))}

            </div>
        </div>
    )
}

export default dashQuests;