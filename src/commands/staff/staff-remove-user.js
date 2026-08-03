/**
 * /staff-remove-user — Remove a user from the virtual staff list
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig, saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'staff',

  data: new SlashCommandBuilder()
    .setName('staff-remove-user')
    .setDescription('Remove a user from virtual staff')
    .addUserOption(opt => opt.setName('user').setDescription('User to remove from staff').setRequired(true)),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const target = interaction.options.getUser('user');

    config.virtualStaff = Array.isArray(config.virtualStaff) ? config.virtualStaff : [];

    const index = config.virtualStaff.findIndex(s => s.id === target.id);
    if (index === -1) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.warn)
          .setTitle('⚠️ Not Virtual Staff')
          .setDescription(`${target} is not registered as virtual staff.`)
          .setFooter({ text: '✦ Icy Companion' })
          .setTimestamp()
        ],
        ephemeral: true
      });
    }

    const removed = config.virtualStaff.splice(index, 1)[0];
    saveServerConfig(interaction.guild.id, config);

    const lines = [
      `**User:** ${target} (\`${target.id}\`)`,
      `**Originally added by:** ${removed.addedByTag || removed.addedBy}`,
      `**Added on:** ${removed.addedAt ? new Date(removed.addedAt).toLocaleDateString() : 'unknown'}`,
      '',
      `📋 Remaining virtual staff: \`${config.virtualStaff.length}\``
    ];

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ User Removed from Staff')
        .setDescription(lines.join('\n'))
        .setFooter({ text: '✦ Icy Companion — Staff Management' })
        .setTimestamp()
      ]
    });
  }
};
