import { RebarPlugin } from './runtime';
import authentication from '../../../plugins/authentication.plugin';
import inventory from '../../../plugins/inventory.plugin';
import jobs from '../../../plugins/jobs.plugin';
import playerManagement from '../../../plugins/player-management.plugin';
import vehicles from '../../../plugins/vehicles.plugin';

export const plugins: RebarPlugin[] = [
  authentication,
  playerManagement,
  vehicles,
  inventory,
  jobs,
];
