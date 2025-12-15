import { DecisionInput, DecisionOutput } from './fsm-engine/types';
export declare function decideNextState(input: DecisionInput): Promise<DecisionOutput>;
