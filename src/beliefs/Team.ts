import * as collections from '../util/collections';
import * as traverse from '../util/traverse'
import * as w from '../model';
import Vec from '../util/vector';

export class Team {
    public score = 0;

    constructor(public id: number) {
    }

    static initializeTeams(view: w.View): Team[] {
        return [
            new Team(w.Teams.Self),
            new Team(w.Teams.Enemy)
        ];
    }

    static update(view: w.View, teams: Team[]) {
        for (const id in view.scores) {
            teams[id].score = view.scores[id];
        }
    }
}

export default Team;