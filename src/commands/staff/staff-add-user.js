/**
 * /staff-add-user — Add a user directly to the staff list (without a role)
 * This creates a "virtual staff" entry that grants staff command access.
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerConfig, saveServerConfig } = require('../../utils/configManager');
const { guard } = require('../../utils/guildAuth');

const ICY = { frost: 0x00d4ff, success: 0x00f5a0, error: 0xff3d71, warn: 0xffaa00 };

module.exports = {
  category: 'staff',

  data: new SlashCommandBuilder()
    .setName('staff-add-user')
    .setDescription('Add a user as staff (bypasses role requirement)')
    .addUserOption(opt => opt.setName('user').setDescription('User to add as staff').setRequired(true))
    .addStringOption(opt => opt.setName('note').setDescription('Optional note about this staff member').setRequired(false)),

  async execute(interaction) {
    const { ok, config } = await guard(interaction, 'owner');
    if (!ok) return;

    const target = interaction.options.getUser('user');
    const note = interaction.options.getString('note');

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.error)
          .setTitle('❌ Not in Server')
          .setDescription(`${target} is not a member of this server.`)
          .setFooter({ text: '✦ Icy Companion' })
          .setTimestamp()
        ],
        ephemeral: true
      });
    }

    // Ensure virtualStaff array exists
    config.virtualStaff = Array.isArray(config.virtualStaff) ? config.virtualStaff : [];

    // Check if already virtual staff
    if (config.virtualStaff.some(s => s.id === target.id)) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(ICY.warn)
          .setTitle('⚠️ Already Staff')
          .setDescription(`${target} is already registered as virtual staff.`)
          .setFooter({ text: '✦ Icy Companion' })
          .setTimestamp()
        ],
        ephemeral: true
      });
    }

    // Add to virtual staff
    config.virtualStaff.push({
      id: target.id,
      tag: target.tag,
      addedBy: interaction.user.id,
      addedByTag: interaction.user.tag,
      addedAt: new Date().toISOString(),
      note: note || null
    });

    saveServerConfig(interaction.guild.id, config);

    const lines = [
      `**User:** ${target} (\`${target.id}\`)`,
      `**Added by:** ${interaction.user}`,
    ];
    if (note) lines.push(`**Note:** ${note}`);
    lines.push('', `📋 Total virtual staff: \`${config.virtualStaff.length}\``);

    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(ICY.success)
        .setAuthor({ name: '✦ Icy Companion', iconURL: interaction.client.user?.displayAvatarURL?.() || undefined })
        .setTitle('✅ User Added to Staff')
        .setDescription(lines.join('\n'))
        .setFooter({ text: '✦ Icy Companion — Staff Management' })
        .setTimestamp()
      ]
    });
  }
};
