/**
 * /staff-users — List all virtual staff members (added without roles)
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'staff',

  data: new SlashCommandBuilder()
    .setName('staff-users')
    .setDescription('List all virtual staff members (added without roles)'),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'staff');
    if (!ok) return;

    const virtualStaff = Array.isArray(config.virtualStaff) ? config.virtualStaff : [];

    if (!virtualStaff.length) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.warn)
          .setTitle('📋 Virtual Staff List')
          .setDescription('No virtual staff members found.\n\nUse `/staff-add-user` to add users as staff without requiring a role.')
          .setFooter({ text: '✦ Icy Companion' })
          .setTimestamp()
        ],
        ephemeral: true
      });
    }

    const lines = virtualStaff.map((s, i) => {
      const user = interaction.guild.members.cache.get(s.id);
      const status = user ? '🟢' : '🔴';
      const note = s.note ? ` — _${s.note}_` : '';
      return `${status} **${i + 1}.** <@${s.id}>${note}`;
    });

    const online = virtualStaff.filter(s => interaction.guild.members.cache.has(s.id)).length;

    const embed = new EmbedBuilder()
      .setColor(ICY.frost)
      .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
      .setTitle('📋 Virtual Staff Members')
      .setDescription([
        '```',
        `  Total: ${virtualStaff.length} | In Server: ${online} | Left: ${virtualStaff.length - online}`,
        '```',
        '',
        lines.join('\n'),
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '> 🟢 = In server  |  🔴 = Left server',
        '> Use `/staff-add-user` to add | `/staff-remove-user` to remove',
      ].join('\n'))
      .setFooter({ text: `✦ ${virtualStaff.length} virtual staff • ${interaction.guild.name}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
